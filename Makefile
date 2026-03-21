.PHONY: all build test vet tidy run-local db-up db-down db-reset docker-up docker-down

all: tidy build

tidy:
	go mod tidy

build:
	@echo "Building all services..."
	go build -o bin/gateway ./services/gateway/
	go build -o bin/auth ./services/auth/
	go build -o bin/collector ./services/collector/
	go build -o bin/stock-analytics ./services/stock-analytics/
	go build -o bin/sales-analytics ./services/sales-analytics/
	go build -o bin/competitor ./services/competitor/
	go build -o bin/seo ./services/seo/
	go build -o bin/notifications ./services/notifications/
	go build -o bin/fashion-analytics ./services/fashion-analytics/
	@echo "All services built successfully!"

test:
	go test ./...

vet:
	go vet ./...

# --- Database ---

db-up:
	docker compose up -d postgres redis
	@echo "Waiting for PostgreSQL..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		pg_isready -h localhost -p 5432 -q 2>/dev/null && break; \
		sleep 1; \
	done
	@echo "PostgreSQL and Redis are ready."

db-down:
	docker compose stop postgres redis

db-reset:
	docker compose down -v postgres redis
	$(MAKE) db-up

db-logs:
	docker compose logs -f postgres redis

# --- Local run ---

run-local: build db-up
	./run-local.sh

# --- Individual services ---

run-gateway:
	HTTP_PORT=8080 go run ./services/gateway/

run-auth:
	HTTP_PORT=8081 go run ./services/auth/

run-collector:
	HTTP_PORT=8082 go run ./services/collector/

run-stock:
	HTTP_PORT=8083 go run ./services/stock-analytics/

run-sales:
	HTTP_PORT=8084 go run ./services/sales-analytics/

run-competitor:
	HTTP_PORT=8085 go run ./services/competitor/

run-seo:
	HTTP_PORT=8086 go run ./services/seo/

run-notifications:
	HTTP_PORT=8087 go run ./services/notifications/

run-fashion:
	HTTP_PORT=8088 go run ./services/fashion-analytics/

# --- Docker ---

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
