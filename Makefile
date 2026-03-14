.PHONY: all build run-gateway run-auth run-collector run-stock run-sales run-competitor run-seo run-notifications tidy

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
	@echo "All services built successfully!"

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

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down
