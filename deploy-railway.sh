#!/usr/bin/env bash
set -euo pipefail

# ============================================
# WB Seller Tools — Railway Deploy Script
# ============================================
# Использование:
#   chmod +x deploy-railway.sh
#   ./deploy-railway.sh
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# --- Проверка Railway CLI ---
if ! command -v railway &>/dev/null; then
  warn "Railway CLI не найден. Устанавливаю..."
  npm install -g @railway/cli || error "Не удалось установить Railway CLI. Попробуйте: npm install -g @railway/cli"
fi
info "Railway CLI: $(railway --version)"

# --- Проверка авторизации ---
if ! railway whoami &>/dev/null 2>&1; then
  warn "Вы не авторизованы в Railway"
  railway login || error "Не удалось авторизоваться"
fi
info "Авторизован: $(railway whoami 2>/dev/null)"

# --- Инициализация проекта ---
if [ ! -f ".railway/config.json" ]; then
  warn "Railway проект не инициализирован"
  echo ""
  echo "Создаю новый проект..."
  railway init || error "Не удалось создать проект"
fi
info "Проект Railway подключён"

# --- Генерация JWT_SECRET ---
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
info "JWT_SECRET готов"

# --- Список сервисов ---
SERVICES=(auth collector stock-analytics sales-analytics competitor seo notifications fashion-analytics gateway)

# --- Деплой каждого сервиса ---
echo ""
echo "========================================="
echo "  Деплой ${#SERVICES[@]} микросервисов"
echo "========================================="
echo ""

for svc in "${SERVICES[@]}"; do
  echo "-------------------------------------------"
  info "Деплою сервис: $svc"

  # Создаём сервис
  railway service --new "$svc" 2>/dev/null || railway service "$svc" 2>/dev/null || true

  # Общие переменные
  railway variables --set "HTTP_PORT=8080" "JWT_SECRET=$JWT_SECRET" 2>/dev/null || true

  # Сервис-специфичные переменные
  case "$svc" in
    gateway)
      railway variables --set \
        "AUTH_SERVICE_URL=http://auth.railway.internal:8080" \
        "COLLECTOR_SERVICE_URL=http://collector.railway.internal:8080" \
        "STOCK_SERVICE_URL=http://stock-analytics.railway.internal:8080" \
        "SALES_SERVICE_URL=http://sales-analytics.railway.internal:8080" \
        "COMPETITOR_SERVICE_URL=http://competitor.railway.internal:8080" \
        "SEO_SERVICE_URL=http://seo.railway.internal:8080" \
        "NOTIFICATION_SERVICE_URL=http://notifications.railway.internal:8080" \
        "FASHION_SERVICE_URL=http://fashion-analytics.railway.internal:8080" \
        2>/dev/null || true
      ;;
    collector)
      railway variables --set \
        "AUTH_SERVICE_URL=http://auth.railway.internal:8080" \
        2>/dev/null || true
      ;;
    stock-analytics|sales-analytics|fashion-analytics)
      railway variables --set \
        "COLLECTOR_SERVICE_URL=http://collector.railway.internal:8080" \
        2>/dev/null || true
      ;;
  esac

  # Деплой
  railway up --dockerfile "services/$svc/Dockerfile" --detach || warn "Деплой $svc завершился с ошибкой"
  info "$svc — отправлен на сборку"
done

# --- Публичный домен для gateway ---
echo ""
echo "========================================="
echo "  Настройка публичного доступа"
echo "========================================="
echo ""

railway service gateway
GATEWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")
if [ -n "$GATEWAY_DOMAIN" ]; then
  info "Gateway URL: https://$GATEWAY_DOMAIN"
else
  warn "Не удалось создать домен для gateway. Создайте вручную: railway service gateway && railway domain"
fi

# --- Деплой фронтенда ---
echo ""
read -p "Задеплоить фронтенд (web)? [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  railway service --new web 2>/dev/null || railway service web 2>/dev/null || true

  if [ -n "$GATEWAY_DOMAIN" ]; then
    railway variables --set "NEXT_PUBLIC_API_URL=https://$GATEWAY_DOMAIN" 2>/dev/null || true
  else
    warn "Укажите NEXT_PUBLIC_API_URL вручную после получения домена gateway"
  fi

  railway up --dockerfile web/Dockerfile --detach || warn "Деплой web завершился с ошибкой"
  WEB_DOMAIN=$(railway domain 2>/dev/null || echo "")
  if [ -n "$WEB_DOMAIN" ]; then
    info "Frontend URL: https://$WEB_DOMAIN"
  fi
fi

# --- Итог ---
echo ""
echo "========================================="
echo -e "  ${GREEN}Деплой завершён!${NC}"
echo "========================================="
echo ""
echo "Полезные команды:"
echo "  railway logs          — логи текущего сервиса"
echo "  railway service <имя> — переключиться на сервис"
echo "  railway status        — статус деплоя"
echo "  railway open          — открыть дашборд в браузере"
echo ""
if [ -n "${GATEWAY_DOMAIN:-}" ]; then
  echo -e "API:      ${GREEN}https://$GATEWAY_DOMAIN${NC}"
fi
if [ -n "${WEB_DOMAIN:-}" ]; then
  echo -e "Frontend: ${GREEN}https://$WEB_DOMAIN${NC}"
fi
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "(сохраните его — он нужен для всех сервисов)"
