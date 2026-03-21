package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// ConnectRedis creates a Redis client and verifies the connection.
func ConnectRedis(ctx context.Context, redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	for attempt := 1; attempt <= 5; attempt++ {
		if err := client.Ping(ctx).Err(); err == nil {
			log.Printf("Connected to Redis (attempt %d)", attempt)
			return client, nil
		}
		delay := time.Duration(attempt) * time.Second
		log.Printf("Redis connection attempt %d failed: %v, retrying in %s", attempt, err, delay)
		time.Sleep(delay)
	}

	return nil, fmt.Errorf("failed to connect to Redis after 5 attempts: %w", err)
}
