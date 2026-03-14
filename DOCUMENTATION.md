# WB Seller Analytics — Документация платформы

## Оглавление

1. [Обзор проекта](#обзор-проекта)
2. [Архитектура](#архитектура)
3. [Технологический стек](#технологический-стек)
4. [Микросервисы](#микросервисы)
5. [API Reference](#api-reference)
6. [Модели данных](#модели-данных)
7. [Развёртывание](#развёртывание)
8. [Конфигурация](#конфигурация)
9. [Специализация: одежда](#специализация-одежда)

---

## Обзор проекта

**WB Seller Analytics** — микросервисная платформа аналитики для продавцов одежды на Wildberries. Платформа предоставляет инструменты для:

- Отслеживания продаж, заказов и остатков
- SEO-аналитики и управления ключевыми словами
- Мониторинга позиций товаров в поиске
- Анализа конкурентов
- Умных уведомлений

**Целевая аудитория:** продавцы одежды на Wildberries (fashion-селлеры).

---

## Архитектура

### Общая схема

```
                    ┌─────────────┐
                    │   Клиент    │
                    │ (Browser /  │
                    │  Mobile)    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Gateway   │
                    │   :8080     │
                    └──────┬──────┘
                           │
          ┌────────┬───────┼───────┬────────┬──────────┐
          │        │       │       │        │          │
    ┌─────▼──┐ ┌───▼───┐ ┌▼────┐ ┌▼─────┐ ┌▼───────┐ ┌▼──────────┐
    │  Auth  │ │Collect│ │Stock│ │Sales │ │Compet- │ │    SEO     │
    │ :8081  │ │ :8082 │ │:8083│ │:8084 │ │itor   │ │   :8086   │
    └────────┘ └───────┘ └─────┘ └──────┘ │:8085   │ └───────────┘
                                          └────────┘
                                                      ┌──────────┐
                                                      │Notificat.│
                                                      │  :8087   │
                                                      └──────────┘
```

### Принципы архитектуры

| Принцип | Реализация |
|---------|------------|
| Микросервисы | Каждый сервис — отдельный процесс с собственным портом |
| API Gateway | Единая точка входа, маршрутизация через reverse proxy |
| Аутентификация | JWT (HMAC-SHA256), проверка на уровне Gateway |
| Безопасность API-ключей | AES-256-GCM шифрование |
| Контейнеризация | Docker multi-stage build, docker-compose |
| Потокобезопасность | sync.RWMutex для конкурентного доступа |

---

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Язык | Go 1.24 |
| HTTP | net/http (стандартная библиотека) |
| Аутентификация | github.com/golang-jwt/jwt/v5 |
| Хэширование паролей | golang.org/x/crypto (bcrypt) |
| Контейнеры | Docker, Docker Compose |
| Базовый образ | alpine:3.19 |
| Хранилище | In-memory (→ PostgreSQL по roadmap) |

---

## Микросервисы

### 1. Gateway (порт 8080)

**Файл:** `services/gateway/main.go`

API-шлюз, который маршрутизирует все входящие запросы к соответствующим сервисам.

**Маршрутизация:**

| Префикс | Целевой сервис |
|---------|---------------|
| `/api/auth/` | Auth (8081) |
| `/api/collector/` | Collector (8082) |
| `/api/stock/` | Stock Analytics (8083) |
| `/api/sales/` | Sales Analytics (8084) |
| `/api/competitors/` | Competitor (8085) |
| `/api/seo/` | SEO (8086) |
| `/api/notifications/` | Notifications (8087) |

**Функции:**
- Reverse proxy через `httputil.NewSingleHostReverseProxy`
- CORS-заголовки (Allow-Origin: *, методы GET/POST/PUT/DELETE)
- Health-check: `GET /health`

---

### 2. Auth Service (порт 8081)

**Файл:** `services/auth/main.go`

Аутентификация и управление API-ключами.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация нового пользователя |
| POST | `/api/auth/login` | Вход, получение JWT-токена |
| GET | `/api/auth/profile` | Профиль текущего пользователя (требует JWT) |
| POST | `/api/auth/api-keys` | Создание API-ключа (требует JWT) |
| GET | `/api/auth/api-keys` | Список API-ключей (требует JWT) |

**Регистрация:**
```json
POST /api/auth/register
{
  "email": "seller@example.com",
  "password": "securepass123",
  "name": "Иван Петров"
}

Response 201:
{
  "id": 1,
  "email": "seller@example.com",
  "name": "Иван Петров",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Логин:**
```json
POST /api/auth/login
{
  "email": "seller@example.com",
  "password": "securepass123"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "seller@example.com", "name": "Иван Петров" }
}
```

**JWT-токен:**
- Алгоритм: HS256
- Срок жизни: 24 часа
- Claims: `user_id`, `email`, `exp`
- Заголовок: `Authorization: Bearer <token>`

---

### 3. Collector Service (порт 8082)

**Файл:** `services/collector/main.go`

Сбор данных с Wildberries API.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/collector/sync` | Запуск синхронизации данных |
| GET | `/api/collector/status` | Статус последней синхронизации |
| GET | `/api/collector/products` | Список товаров пользователя |

**Синхронизация** собирает параллельно:
- Продажи за последние 30 дней (`/api/v1/supplier/sales`)
- Заказы за последние 30 дней (`/api/v1/supplier/orders`)
- Остатки (`/api/v1/supplier/stocks`)

**Пример запроса:**
```json
POST /api/collector/sync
Headers: Authorization: Bearer <jwt>

Response 200:
{
  "status": "completed",
  "sales_count": 1523,
  "orders_count": 2104,
  "stocks_count": 847,
  "synced_at": "2026-03-14T10:00:00Z"
}
```

---

### 4. Stock Analytics (порт 8083)

**Файл:** `services/stock-analytics/main.go`

Анализ остатков и рекомендации по поставкам.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/stock/analytics` | Полный анализ остатков |
| GET | `/api/stock/supply-recommendations` | Рекомендации по поставкам |

**Аналитика включает:**
- Остатки по складам
- Расчёт дней до исчерпания запасов (days of stock)
- Средние продажи за день
- Рекомендуемое количество для поставки (на 30 дней)
- Уровень срочности: critical / warning / normal

---

### 5. Sales Analytics (порт 8084)

**Файл:** `services/sales-analytics/main.go`

Аналитика продаж, тренды, ABC-анализ.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/sales/dashboard` | Дашборд продаж |
| GET | `/api/sales/funnel` | Воронка продаж по товарам |
| GET | `/api/sales/abc` | ABC-анализ товаров |
| GET | `/api/sales/trends` | Тренды продаж (4 недели) |

**Дашборд включает:**
- Общая выручка и количество продаж
- Процент возвратов
- Средний чек
- Топ товаров по выручке
- Продажи по дням
- Продажи по регионам

**ABC-анализ:**
- **A** — товары, дающие 80% выручки (звёзды)
- **B** — товары, дающие 80-95% выручки (основа)
- **C** — товары, дающие 95-100% выручки (аутсайдеры)

---

### 6. Competitor Service (порт 8085)

**Файл:** `services/competitor/main.go`

Анализ конкурентов.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/competitors/find` | Поиск конкурентов по ключевому слову |
| POST | `/api/competitors/analyze-gaps` | Анализ пробелов (ваш товар vs конкуренты) |
| POST | `/api/competitors/price-analysis` | Ценовой анализ конкурентов |

**Поиск конкурентов:**
```json
POST /api/competitors/find
{
  "keyword": "платье летнее",
  "nm_id": 12345678
}

Response 200:
{
  "keyword": "платье летнее",
  "your_product": { ... },
  "competitors": [
    {
      "nm_id": 87654321,
      "name": "Платье летнее макси",
      "brand": "BrandX",
      "price": 2990,
      "rating": 4.8,
      "feedbacks": 342,
      "position": 3
    }
  ]
}
```

---

### 7. SEO Service (порт 8086)

**Файл:** `services/seo/main.go`

Ключевые слова и позиции — **ключевой сервис платформы**.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/seo/check-positions` | Проверка позиций по ключевым словам |
| POST | `/api/seo/track-keywords` | Добавить ключевые слова для мониторинга |
| GET | `/api/seo/history` | История позиций с трендами |
| POST | `/api/seo/suggest-keywords` | Генерация подсказок ключевиков |

**Проверка позиций:**
```json
POST /api/seo/check-positions
{
  "nm_id": 12345678,
  "keywords": ["платье летнее", "сарафан женский", "платье в цветочек"]
}

Response 200:
{
  "nm_id": 12345678,
  "results": [
    {
      "keyword": "платье летнее",
      "position": 7,
      "page": 1,
      "checked_at": "2026-03-14T10:00:00Z"
    },
    {
      "keyword": "сарафан женский",
      "position": 0,
      "page": 0,
      "checked_at": "2026-03-14T10:00:00Z"
    }
  ]
}
```

> `position: 0, page: 0` означает, что товар не найден в поиске по данному запросу (проверяется до 5 страниц).

**История позиций:**
```json
GET /api/seo/history?user_id=1

Response 200:
{
  "history": {
    "12345678": {
      "платье летнее": {
        "records": [
          {"position": 12, "page": 1, "checked_at": "2026-03-12T10:00:00Z"},
          {"position": 7, "page": 1, "checked_at": "2026-03-14T10:00:00Z"}
        ],
        "trend": "improving",
        "change": 5
      }
    }
  }
}
```

**Тренды:**
- `improving` — позиция улучшилась (число уменьшилось)
- `declining` — позиция ухудшилась
- `stable` — без изменений
- `change` — разница между предыдущей и текущей позицией

**Подсказка ключевиков:**
```json
POST /api/seo/suggest-keywords
{
  "product_name": "Платье летнее женское в цветочек макси",
  "category": "Платья",
  "brand": "MyBrand"
}

Response 200:
{
  "suggestions": [
    "платье летнее женское",
    "платье в цветочек",
    "платье макси",
    "mybrand платье",
    "платья женские"
  ]
}
```

---

### 8. Notifications Service (порт 8087)

**Файл:** `services/notifications/main.go`

Система уведомлений и алертов.

**Эндпоинты:**

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/notifications/` | Список уведомлений |
| POST | `/api/notifications/read/{id}` | Отметить как прочитанное |
| POST | `/api/notifications/generate` | Генерация алертов из аналитики |

**Типы алертов:**

| Тип | Описание | Severity |
|-----|----------|----------|
| `stock_critical` | Критически низкие остатки | critical |
| `stock_warning` | Остатки заканчиваются | warning |
| `sales_drop` | Падение продаж > 20% | warning |
| `position_drop` | Позиция упала > 10 мест | warning |
| `new_competitor` | Появился новый конкурент | info |

**Пример алерта:**
```json
{
  "id": 1,
  "user_id": 1,
  "type": "position_drop",
  "severity": "warning",
  "title": "Позиция упала",
  "message": "Товар 12345678: позиция по 'платье летнее' упала с 5 на 18",
  "is_read": false,
  "created_at": "2026-03-14T10:00:00Z"
}
```

---

## Модели данных

### User
```go
type User struct {
    ID           int64     `json:"id" db:"id"`
    Email        string    `json:"email" db:"email"`
    PasswordHash string    `json:"-" db:"password_hash"`
    Name         string    `json:"name" db:"name"`
    CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
```

### Product
```go
type Product struct {
    NmID      int64   `json:"nm_id"`
    SKU       string  `json:"sku"`
    Brand     string  `json:"brand"`
    Name      string  `json:"name"`
    Category  string  `json:"category"`
    Price     float64 `json:"price"`
    Discount  int     `json:"discount"`
    Rating    float64 `json:"rating"`
    Feedbacks int     `json:"feedbacks"`
}
```

### Sale
```go
type Sale struct {
    Date         time.Time `json:"date"`
    SupplierName string    `json:"supplierArticle"`
    NmID         int64     `json:"nmId"`
    Brand        string    `json:"brand"`
    Category     string    `json:"category"`
    Price        float64   `json:"totalPrice"`
    Discount     int       `json:"discountPercent"`
    SPP          float64   `json:"spp"`
    ForPay       float64   `json:"forPay"`
    Warehouse    string    `json:"warehouseName"`
    Region       string    `json:"regionName"`
    IsReturn     bool      `json:"isReturn"`
}
```

### KeywordPosition
```go
type KeywordPosition struct {
    ID        int64     `json:"id" db:"id"`
    UserID    int64     `json:"user_id" db:"user_id"`
    NmID      int64     `json:"nm_id" db:"nm_id"`
    Keyword   string    `json:"keyword" db:"keyword"`
    Position  int       `json:"position" db:"position"`
    Page      int       `json:"page" db:"page"`
    CheckedAt time.Time `json:"checked_at" db:"checked_at"`
}
```

### Stock
```go
type Stock struct {
    SupplierArticle string `json:"supplierArticle"`
    NmID            int64  `json:"nmId"`
    Warehouse       string `json:"warehouseName"`
    Quantity        int    `json:"quantity"`
    InWayToClient   int    `json:"inWayToClient"`
    InWayFromClient int    `json:"inWayFromClient"`
}
```

### Alert
```go
type Alert struct {
    ID        int64     `json:"id" db:"id"`
    UserID    int64     `json:"user_id" db:"user_id"`
    Type      string    `json:"type" db:"type"`
    Severity  string    `json:"severity" db:"severity"`
    Title     string    `json:"title" db:"title"`
    Message   string    `json:"message" db:"message"`
    IsRead    bool      `json:"is_read" db:"is_read"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}
```

---

## Развёртывание

### Требования
- Docker >= 20.10
- Docker Compose >= 2.0
- Go 1.24+ (для локальной разработки)

### Запуск через Docker Compose

```bash
# Клонировать репозиторий
git clone <repo-url>
cd wb-seller-analytics

# Запустить все сервисы
docker-compose up --build

# Запустить в фоне
docker-compose up --build -d

# Посмотреть логи
docker-compose logs -f

# Остановить
docker-compose down
```

### Запуск отдельного сервиса (разработка)

```bash
# Установить зависимости
go mod download

# Запустить конкретный сервис
go run services/seo/main.go

# Запустить все через Makefile
make run-gateway
make run-auth
make run-collector
make run-seo
# ... и т.д.
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|-----------|----------|-------------|
| `JWT_SECRET` | Секрет для подписи JWT | `wb-analytics-secret-key-change-in-production` |
| `ENCRYPTION_KEY` | Ключ AES-256 для API-ключей | `wb-analytics-encryption-key!!` |
| `WB_API_KEY` | API-ключ продавца Wildberries | — |
| `GATEWAY_PORT` | Порт gateway | `8080` |

---

## Конфигурация

### Wildberries API

Для работы платформы необходим API-ключ продавца Wildberries:

1. Войдите в [Личный кабинет WB](https://seller.wildberries.ru/)
2. Перейдите в **Настройки → Доступ к API**
3. Создайте ключ с правами:
   - Статистика (продажи, заказы)
   - Контент (карточки товаров)
   - Аналитика

### API-ключи в платформе

Платформа поддерживает управление несколькими WB API-ключами:

```json
POST /api/auth/api-keys
{
  "name": "Основной магазин",
  "wb_api_key": "eyJhbGciOiJFUzI1NiIs..."
}
```

Ключи шифруются AES-256-GCM перед сохранением.

---

## Специализация: одежда

### Почему одежда — особый сегмент

Одежда на Wildberries имеет уникальные особенности:

1. **Высокий процент возвратов** (30-50%) — покупатели заказывают несколько размеров
2. **Ярко выраженная сезонность** — коллекции меняются 4 раза в год
3. **Огромная конкуренция** — самая насыщенная категория на WB
4. **Важность SEO** — позиция в поиске = продажи
5. **Размерная матрица** — нужно следить за остатками каждого размера

### Ключевые метрики для fashion-селлера

| Метрика | Описание | Почему важно |
|---------|----------|-------------|
| Выкупаемость | % заказов, которые выкупили | Основной показатель прибыльности |
| Позиция по ключевикам | Место в поиске WB | Прямо влияет на продажи |
| Остатки по размерам | Наличие каждого размера | Нет размера = потеря клиента |
| Сезонный спрос | Динамика спроса по сезонам | Определяет закупки |
| Средний чек | Средняя сумма покупки | Влияет на маржу |
| Возвраты по причинам | Почему возвращают | Точка роста качества |

### Fashion-словарь ключевых слов

Платформа содержит специализированный словарь для автоматической генерации и подсказки ключевых слов:

**Категории одежды:**
платье, юбка, брюки, джинсы, куртка, пальто, шуба, блузка, рубашка, топ, футболка, свитер, кардиган, жилет, комбинезон, костюм, шорты, леггинсы, пиджак, тренч

**Материалы:**
хлопок, лён, шёлк, полиэстер, вискоза, шерсть, кашемир, нейлон, деним, экокожа, замша, бархат, атлас, шифон, трикотаж

**Стили:**
повседневный, деловой, спортивный, вечерний, пляжный, уличный, бохо, минимализм, классический, романтический, гранж, оверсайз, приталенный

**Сезоны:**
летний, зимний, весенний, осенний, демисезонный, утеплённый, лёгкий

**Цвета (трендовые 2025-2026):**
терракотовый, лавандовый, мятный, пыльная роза, графитовый, молочный, изумрудный, бордо, горчичный, небесно-голубой

---

## Быстрый старт

### 1. Регистрация

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"shop@fashion.ru","password":"pass123","name":"Fashion Shop"}'
```

### 2. Синхронизация данных

```bash
curl -X POST http://localhost:8080/api/collector/sync \
  -H "Authorization: Bearer <token>"
```

### 3. Проверка позиций

```bash
curl -X POST http://localhost:8080/api/seo/check-positions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nm_id":12345678,"keywords":["платье летнее","сарафан макси"]}'
```

### 4. Просмотр алертов

```bash
curl http://localhost:8080/api/notifications/ \
  -H "Authorization: Bearer <token>"
```

---

## Контакты и поддержка

- **Issues:** GitHub Issues
- **Документация:** Этот файл + ROADMAP.md
- **Лицензия:** CC0 Universal (Public Domain)
