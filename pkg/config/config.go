package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server
	HTTPPort string
	GRPCPort string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// WB API
	WBAPIBaseURL string

	// JWT
	JWTSecret    string
	JWTTokenTTL  time.Duration

	// Service-specific
	CollectorInterval time.Duration
}

func Load() *Config {
	return &Config{
		HTTPPort:          getEnv("HTTP_PORT", "8080"),
		GRPCPort:          getEnv("GRPC_PORT", "9090"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/wb_analytics?sslmode=disable"),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		WBAPIBaseURL:      getEnv("WB_API_BASE_URL", "https://statistics-api.wildberries.ru"),
		JWTSecret:         getEnv("JWT_SECRET", "change-me-in-production"),
		JWTTokenTTL:       getDurationEnv("JWT_TOKEN_TTL", 24*time.Hour),
		CollectorInterval: getDurationEnv("COLLECTOR_INTERVAL", 30*time.Minute),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	minutes, err := strconv.Atoi(val)
	if err != nil {
		return fallback
	}
	return time.Duration(minutes) * time.Minute
}
