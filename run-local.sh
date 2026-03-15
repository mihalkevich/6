#!/usr/bin/env bash
set -euo pipefail

# ============================================
# WB Seller Tools — локальный запуск (без Docker)
# ============================================

ROOT="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$ROOT/.bin"
LOG_DIR="$ROOT/.logs"
PID_DIR="$ROOT/.pids"

JWT_SECRET="${JWT_SECRET:-local-dev-secret-$(openssl rand -hex 8)}"

mkdir -p "$BIN_DIR" "$LOG_DIR" "$PID_DIR"

# Порты сервисов
declare -A PORTS=(
  [auth]=8081
  [collector]=8082
  [stock-analytics]=8083
  [sales-analytics]=8084
  [competitor]=8085
  [seo]=8086
  [notifications]=8087
  [fashion-analytics]=8088
  [gateway]=8080
)

# Зависимые переменные окружения сервисов
declare -A ENVS=(
  [auth]="JWT_SECRET=$JWT_SECRET"
  [collector]="JWT_SECRET=$JWT_SECRET AUTH_SERVICE_URL=http://localhost:8081"
  [stock-analytics]="JWT_SECRET=$JWT_SECRET COLLECTOR_SERVICE_URL=http://localhost:8082"
  [sales-analytics]="JWT_SECRET=$JWT_SECRET COLLECTOR_SERVICE_URL=http://localhost:8082"
  [competitor]="JWT_SECRET=$JWT_SECRET"
  [seo]="JWT_SECRET=$JWT_SECRET"
  [notifications]="JWT_SECRET=$JWT_SECRET"
  [fashion-analytics]="JWT_SECRET=$JWT_SECRET COLLECTOR_SERVICE_URL=http://localhost:8082"
  [gateway]="JWT_SECRET=$JWT_SECRET \
    AUTH_SERVICE_URL=http://localhost:8081 \
    COLLECTOR_SERVICE_URL=http://localhost:8082 \
    STOCK_SERVICE_URL=http://localhost:8083 \
    SALES_SERVICE_URL=http://localhost:8084 \
    COMPETITOR_SERVICE_URL=http://localhost:8085 \
    SEO_SERVICE_URL=http://localhost:8086 \
    NOTIFICATION_SERVICE_URL=http://localhost:8087 \
    FASHION_SERVICE_URL=http://localhost:8088"
)

stop_all() {
  echo ""
  echo "Останавливаю сервисы..."
  for svc in "${!PORTS[@]}"; do
    local pidfile="$PID_DIR/$svc.pid"
    if [ -f "$pidfile" ]; then
      local pid
      pid=$(cat "$pidfile")
      kill "$pid" 2>/dev/null && echo "  [$svc] остановлен (pid $pid)" || true
      rm -f "$pidfile"
    fi
  done
}
trap stop_all EXIT INT TERM

# --- Сборка ---
echo "Сборка сервисов..."
SERVICES=(auth collector stock-analytics sales-analytics competitor seo notifications fashion-analytics gateway)

for svc in "${SERVICES[@]}"; do
  go build -o "$BIN_DIR/$svc" "$ROOT/services/$svc/" && echo "  [✓] $svc"
done
echo ""

# --- Запуск ---
echo "Запускаю сервисы..."
for svc in "${SERVICES[@]}"; do
  port="${PORTS[$svc]}"
  envs="${ENVS[$svc]}"
  logfile="$LOG_DIR/$svc.log"

  # Запускаем с нужными переменными
  env $envs HTTP_PORT=$port "$BIN_DIR/$svc" > "$logfile" 2>&1 &
  pid=$!
  echo "$pid" > "$PID_DIR/$svc.pid"
  sleep 0.3

  if kill -0 "$pid" 2>/dev/null; then
    echo "  [✓] $svc  port=$port  pid=$pid"
  else
    echo "  [✗] $svc упал — см. $logfile"
    cat "$logfile"
  fi
done

echo ""
echo "========================================="
echo "  Все сервисы запущены!"
echo "========================================="
echo ""
echo "  API Gateway:  http://localhost:8080"
echo "  Auth:         http://localhost:8081"
echo "  Collector:    http://localhost:8082"
echo ""
echo "  Логи:  tail -f .logs/<сервис>.log"
echo "  Стоп:  Ctrl+C"
echo ""
echo "  JWT_SECRET=$JWT_SECRET"
echo ""

# --- Держим процесс живым ---
wait
