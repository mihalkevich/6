package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ConnectPostgres creates a connection pool to PostgreSQL.
// It retries up to 5 times with exponential backoff.
func ConnectPostgres(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database URL: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute

	var pool *pgxpool.Pool
	for attempt := 1; attempt <= 5; attempt++ {
		pool, err = pgxpool.NewWithConfig(ctx, config)
		if err == nil {
			if pingErr := pool.Ping(ctx); pingErr == nil {
				log.Printf("Connected to PostgreSQL (attempt %d)", attempt)
				return pool, nil
			}
			pool.Close()
		}
		delay := time.Duration(attempt) * time.Second
		log.Printf("PostgreSQL connection attempt %d failed: %v, retrying in %s", attempt, err, delay)
		time.Sleep(delay)
	}
	return nil, fmt.Errorf("failed to connect to PostgreSQL after 5 attempts: %w", err)
}

// RunMigrations executes the embedded SQL migration against the database.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool, sql string) error {
	_, err := pool.Exec(ctx, sql)
	if err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	log.Println("Database migrations applied successfully")
	return nil
}
