# Деплой на Railway

## Быстрый старт

### 1. Создайте проект в Railway

Перейдите на [railway.app](https://railway.app) и создайте новый проект.

### 2. Добавьте сервисы (9 backend + 1 frontend)

В Railway проекте нажмите **"New Service"** → **"GitHub Repo"** для каждого сервиса.
Все сервисы используют **один и тот же репозиторий**, но разные Dockerfile.

| Сервис | Dockerfile Path | Переменные окружения |
|--------|----------------|---------------------|
| auth | `services/auth/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET` |
| collector | `services/collector/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET`, `AUTH_SERVICE_URL` |
| stock-analytics | `services/stock-analytics/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET`, `COLLECTOR_SERVICE_URL` |
| sales-analytics | `services/sales-analytics/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET`, `COLLECTOR_SERVICE_URL` |
| competitor | `services/competitor/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET` |
| seo | `services/seo/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET` |
| notifications | `services/notifications/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET` |
| fashion-analytics | `services/fashion-analytics/Dockerfile` | `HTTP_PORT=8080`, `JWT_SECRET`, `COLLECTOR_SERVICE_URL` |
| gateway | `services/gateway/Dockerfile` | `HTTP_PORT=8080`, все `*_SERVICE_URL` |
| web | `web/Dockerfile` | `NEXT_PUBLIC_API_URL` |

### 3. Настройка каждого сервиса в Railway

Для каждого сервиса в Railway:

1. **Settings** → **Build** → **Dockerfile Path**: укажите путь из таблицы выше
2. **Settings** → **Build** → **Root Directory**: оставьте `/` (корень репо)
3. **Settings** → **Networking** → **Port**: `8080` (для web: `3000`)

### 4. Переменные окружения

#### Общая переменная (Shared Variable в Railway):
```
JWT_SECRET=ваш-секретный-ключ-минимум-32-символа
```

#### Gateway — нужны URL всех внутренних сервисов:
```
AUTH_SERVICE_URL=http://auth.railway.internal:8080
COLLECTOR_SERVICE_URL=http://collector.railway.internal:8080
STOCK_SERVICE_URL=http://stock-analytics.railway.internal:8080
SALES_SERVICE_URL=http://sales-analytics.railway.internal:8080
COMPETITOR_SERVICE_URL=http://competitor.railway.internal:8080
SEO_SERVICE_URL=http://seo.railway.internal:8080
NOTIFICATION_SERVICE_URL=http://notifications.railway.internal:8080
FASHION_SERVICE_URL=http://fashion-analytics.railway.internal:8080
```

> В Railway внутренние сервисы доступны по `http://<service-name>.railway.internal:<port>`.
> Имя сервиса = то, что вы задали при создании в Railway.

#### Collector:
```
AUTH_SERVICE_URL=http://auth.railway.internal:8080
```

#### stock-analytics, sales-analytics, fashion-analytics:
```
COLLECTOR_SERVICE_URL=http://collector.railway.internal:8080
```

#### Web (frontend):
```
NEXT_PUBLIC_API_URL=https://gateway-production-xxxx.up.railway.app
```
> Используйте **публичный URL** gateway (появится после деплоя и включения Public Networking).

### 5. Публичный доступ

Включите **Public Networking** только для двух сервисов:
- **gateway** — API для фронтенда
- **web** — Next.js фронтенд

Остальные сервисы остаются приватными (доступны только через internal networking).

### 6. Деплой

После настройки всех сервисов Railway автоматически соберёт и задеплоит каждый при пуше в репозиторий.

## Стоимость

Railway тарифицирует по потреблению. Каждый микросервис потребляет ~50-100MB RAM.
Ориентировочно: **$5-15/мес** на Hobby плане для всех сервисов.

## Альтернатива: Docker Compose на VPS

Если хотите сэкономить, можно задеплоить всё через `docker-compose.yml` на VPS:

```bash
# На VPS:
git clone <repo-url> && cd wb-seller-tools
echo "JWT_SECRET=your-secret-key-here" > .env
docker compose up -d --build
```
