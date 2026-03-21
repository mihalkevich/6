package main

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/database"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"golang.org/x/crypto/bcrypt"
)

//go:embed migrations.sql
var migrationSQL string

var (
	cfg *config.Config
	db  *pgxpool.Pool
)

func main() {
	cfg = config.Load()
	ctx := context.Background()

	var err error
	db, err = database.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(ctx, db, migrationSQL); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("POST /api/auth/register", handleRegister)
	mux.HandleFunc("POST /api/auth/login", handleLogin)

	// Protected routes
	authMux := http.NewServeMux()
	authMux.HandleFunc("GET /api/keys", handleListKeys)
	authMux.HandleFunc("POST /api/keys", handleAddKey)
	authMux.HandleFunc("DELETE /api/keys/{id}", handleDeleteKey)
	authMux.HandleFunc("GET /api/me", handleMe)

	authMux.HandleFunc("POST /api/keys/resolve", handleResolveKey)

	protected := middleware.AuthMiddleware(cfg.JWTSecret)(authMux)
	mux.Handle("/api/keys", protected)
	mux.Handle("/api/keys/", protected)
	mux.Handle("/api/me", protected)

	log.Printf("Auth service starting on :%s", cfg.HTTPPort)
	log.Fatal(http.ListenAndServe(":"+cfg.HTTPPort, mux))
}

// --- Handlers ---

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Email == "" || req.Password == "" {
		httpError(w, "email and password required", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		httpError(w, "internal error", http.StatusInternalServerError)
		return
	}

	var userID int64
	err = db.QueryRow(r.Context(),
		`INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
		 RETURNING id`,
		req.Email, req.Name, string(hash),
	).Scan(&userID)
	if err != nil {
		httpError(w, "user already exists", http.StatusConflict)
		return
	}

	token, err := generateJWT(userID)
	if err != nil {
		httpError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  map[string]interface{}{"id": userID, "email": req.Email, "name": req.Name},
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var userID int64
	var name, passwordHash string
	err := db.QueryRow(r.Context(),
		`SELECT id, name, password_hash FROM users WHERE email = $1`, req.Email,
	).Scan(&userID, &name, &passwordHash)
	if err != nil {
		httpError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		httpError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := generateJWT(userID)
	if err != nil {
		httpError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  map[string]interface{}{"id": userID, "email": req.Email, "name": name},
	})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var email, name string
	err := db.QueryRow(r.Context(),
		`SELECT email, name FROM users WHERE id = $1`, userID,
	).Scan(&email, &name)
	if err != nil {
		httpError(w, "user not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"id": userID, "email": email, "name": name,
	})
}

type addKeyRequest struct {
	Name    string `json:"name"`
	Token   string `json:"token"`
	WBToken string `json:"wb_token"` // alias accepted from frontend
}

func handleAddKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req addKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	tok := req.Token
	if tok == "" {
		tok = req.WBToken
	}
	if tok == "" {
		httpError(w, "token is required", http.StatusBadRequest)
		return
	}

	encrypted, err := encrypt(tok, cfg.JWTSecret)
	if err != nil {
		httpError(w, "encryption error", http.StatusInternalServerError)
		return
	}

	var keyID int64
	err = db.QueryRow(r.Context(),
		`INSERT INTO api_keys (user_id, name, token_encrypted) VALUES ($1, $2, $3) RETURNING id`,
		userID, req.Name, encrypted,
	).Scan(&keyID)
	if err != nil {
		httpError(w, "failed to save key", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusCreated, map[string]interface{}{
		"id": keyID, "name": req.Name, "is_active": true,
	})
}

func handleListKeys(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rows, err := db.Query(r.Context(),
		`SELECT id, name, is_active FROM api_keys WHERE user_id = $1 ORDER BY id`, userID,
	)
	if err != nil {
		httpError(w, "database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := []map[string]interface{}{}
	for rows.Next() {
		var id int64
		var name string
		var isActive bool
		if err := rows.Scan(&id, &name, &isActive); err != nil {
			continue
		}
		result = append(result, map[string]interface{}{
			"id": id, "name": name, "is_active": isActive,
		})
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{"keys": result})
}

func handleResolveKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req struct {
		KeyID int64 `json:"key_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	var tokenEncrypted string
	err := db.QueryRow(r.Context(),
		`SELECT token_encrypted FROM api_keys WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
		req.KeyID, userID,
	).Scan(&tokenEncrypted)
	if err != nil {
		if err == pgx.ErrNoRows {
			httpError(w, "key not found", http.StatusNotFound)
		} else {
			httpError(w, "database error", http.StatusInternalServerError)
		}
		return
	}

	decrypted, err := decrypt(tokenEncrypted, cfg.JWTSecret)
	if err != nil {
		httpError(w, "decryption error", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]string{"wb_token": decrypted})
}

func handleDeleteKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	idStr := r.PathValue("id")
	keyID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		httpError(w, "invalid key id", http.StatusBadRequest)
		return
	}

	tag, err := db.Exec(r.Context(),
		`UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND user_id = $2`,
		keyID, userID,
	)
	if err != nil || tag.RowsAffected() == 0 {
		httpError(w, "key not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// --- Helpers ---

func generateJWT(userID int64) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(cfg.JWTTokenTTL).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func encrypt(plaintext, key string) (string, error) {
	keyBytes := make([]byte, 32)
	copy(keyBytes, []byte(key))

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}

func decrypt(cipherHex, key string) (string, error) {
	keyBytes := make([]byte, 32)
	copy(keyBytes, []byte(key))

	ciphertext, err := hex.DecodeString(cipherHex)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func httpError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonResponse(w http.ResponseWriter, code int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}
