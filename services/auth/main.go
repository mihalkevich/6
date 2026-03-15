package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/wb-analytics/wb-seller-tools/pkg/config"
	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
	"golang.org/x/crypto/bcrypt"
)

// In-memory store for simplicity; swap for PostgreSQL in production.
var (
	users   = map[string]*userRecord{} // email -> user
	apiKeys = map[int64][]*apiKeyRecord{} // userID -> keys
	nextID  int64
	cfg     *config.Config
)

type userRecord struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	PasswordHash string `json:"-"`
}

type apiKeyRecord struct {
	ID             int64  `json:"id"`
	UserID         int64  `json:"user_id"`
	Name           string `json:"name"`
	TokenEncrypted string `json:"-"`
	IsActive       bool   `json:"is_active"`
}

func main() {
	cfg = config.Load()

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
	if _, exists := users[req.Email]; exists {
		httpError(w, "user already exists", http.StatusConflict)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		httpError(w, "internal error", http.StatusInternalServerError)
		return
	}

	nextID++
	u := &userRecord{ID: nextID, Email: req.Email, Name: req.Name, PasswordHash: string(hash)}
	users[req.Email] = u

	token, err := generateJWT(u.ID)
	if err != nil {
		httpError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user":  map[string]interface{}{"id": u.ID, "email": u.Email, "name": u.Name},
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

	u, exists := users[req.Email]
	if !exists {
		httpError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		httpError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := generateJWT(u.ID)
	if err != nil {
		httpError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user":  map[string]interface{}{"id": u.ID, "email": u.Email, "name": u.Name},
	})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	for _, u := range users {
		if u.ID == userID {
			jsonResponse(w, http.StatusOK, map[string]interface{}{
				"id": u.ID, "email": u.Email, "name": u.Name,
			})
			return
		}
	}
	httpError(w, "user not found", http.StatusNotFound)
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
	// Accept both "token" and "wb_token" fields
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

	nextID++
	key := &apiKeyRecord{
		ID:             nextID,
		UserID:         userID,
		Name:           req.Name,
		TokenEncrypted: encrypted,
		IsActive:       true,
	}
	apiKeys[userID] = append(apiKeys[userID], key)

	jsonResponse(w, http.StatusCreated, map[string]interface{}{
		"id": key.ID, "name": key.Name, "is_active": key.IsActive,
	})
}

func handleListKeys(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	keys := apiKeys[userID]
	result := make([]map[string]interface{}, 0, len(keys))
	for _, k := range keys {
		result = append(result, map[string]interface{}{
			"id": k.ID, "name": k.Name, "is_active": k.IsActive,
		})
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{"keys": result})
}

// handleResolveKey returns the decrypted WB API token for a given key ID.
// Only returns keys belonging to the authenticated user.
func handleResolveKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req struct {
		KeyID int64 `json:"key_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	keys := apiKeys[userID]
	for _, k := range keys {
		if k.ID == req.KeyID && k.IsActive {
			decrypted, err := decrypt(k.TokenEncrypted, cfg.JWTSecret)
			if err != nil {
				httpError(w, "decryption error", http.StatusInternalServerError)
				return
			}
			jsonResponse(w, http.StatusOK, map[string]string{"wb_token": decrypted})
			return
		}
	}
	httpError(w, "key not found", http.StatusNotFound)
}

func handleDeleteKey(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())
	keys := apiKeys[userID]
	for i, k := range keys {
		if k.IsActive {
			keys[i].IsActive = false
			jsonResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
			return
		}
	}
	httpError(w, "key not found", http.StatusNotFound)
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
