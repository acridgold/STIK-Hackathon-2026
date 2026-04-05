# ERP System Project

Этот проект представляет собой систему с бэкендом на **Python 3.11 (Flask/Gunicorn)**, фронтендом на **React 18 (Vite)** и базой данных **PostgreSQL 15**.

## 🚀 Быстрый запуск (через Docker Compose)

Самый простой способ запустить весь проект (фронтенд, бэкенд и базу данных) одной командой.

### Предварительные требования
* Установленный **Docker** и **Docker Compose**.
* На Fedora убедитесь, что ваш пользователь добавлен в группу `docker`: `sudo usermod -aG docker $USER` (потребуется перезагрузка).

### Инструкция
1. **Запустите контейнеры:**
   ```bash
   docker compose up --build
   ```

2. **Откройте приложение:**
   * **Фронтенд**: http://localhost:5173
   * **Бэкенд (API)**: http://localhost:5000
   * **База данных**: localhost:5433 (PostgreSQL)

3. **Остановка проекта**
   Чтобы остановить и удалить контейнеры, сохранив данные в Volume:
   ```bash
   docker compose down
   ```

### Структура сервисов
| Сервис | Порт | Роль |
|--------|------|------|
| **frontend** | 5173 | React приложение (Vite dev server) |
| **backend** | 5000 | Flask REST API |
| **db** | 5433 | PostgreSQL база данных |

---

## 🛠 Локальная разработка (без Docker)

Если вам нужно запустить проект локально для отладки без Docker, следуйте этим инструкциям.

### Предварительные требования
* **Python 3.11**. На Fedora установите его командой:
  ```bash
  sudo dnf install python3.11
  ```
* **Node.js 18+** для фронтенда:
  ```bash
  sudo dnf install nodejs
  ```

### Инструкция

#### 1. Запустите только базу данных в Docker
```bash
docker compose up db -d
```

#### 2. Запустите бэкенд локально
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.sample .env
python app.py
```

Бэкенд будет доступен на **http://localhost:8080** (для локальной разработки).

#### 3. Запустите фронтенд локально
В отдельном терминале:
```bash
npm install
npm run dev
```

Фронтенд будет доступен на **http://localhost:5173**.

---

## 🔍 Проверка работоспособности

### 1. Просмотр статуса контейнеров
Убедитесь, что все сервисы имеют статус `Up`:
```bash
docker ps
```

### 2. Проверка логов бэкенда
Если сервис не отвечает, проверьте логи на наличие ошибок подключения к БД:
```bash
docker compose logs -f backend
```
*Ожидаемый результат: сообщение `Listening at: http://0.0.0.0:5000`*.

### 3. Проверка маршрутов (API)
Чтобы узнать, какие URL-адреса доступны на сервере, выполните команду внутри контейнера бэкенда:
```bash
docker exec -it erp_backend_container flask routes
```

### 4. Проверка базы данных (PostgreSQL)
Проверьте, создались ли таблицы из файла `create_global_erp.sql`:
```bash
docker exec -it erp_db_container psql -U postgres -d global_erp_db -c "\dt"
```

### 5. Тестирование API
Выполните проверочный запрос к одному из эндпоинтов:
```bash
curl http://localhost:5000/api/companies
```

### 6. Проверка логов фронтенда
Если фронтенд не загружается, проверьте логи:
```bash
docker compose logs -f frontend
```
*Ожидаемый результат: сообщение `Local: http://localhost:5173`*.

---

## 📁 Структура проекта
* `/backend` — Исходный код Python (Flask/Gunicorn)
* `/frontend` — Исходный код React (Vite)
* `/database` — SQL скрипты инициализации БД
* `docker-compose.yaml` — Конфигурация всей инфраструктуры
* `requirements.txt` — Список зависимостей Python
* `package.json` — Список зависимостей Node.js

---

## ⚠️ Решение частых проблем

### Ошибка `docker-compose: command not found`
На свежих версиях Fedora (42+) используйте команду **без дефиса**: `docker compose`.

### Ошибка `Connection Refused` (Backend -> DB в Docker)
Убедитесь, что в `docker-compose.yaml` в качестве хоста базы данных указано имя сервиса `db`, а не `localhost`:
```yaml
environment:
  DATABASE_URL=postgresql://postgres:postgres@db:5432/global_erp_db
```

### Фронтенд не может подключиться к бэкенду
При запуске через `docker compose up`, убедитесь что:
- Frontend контейнер имеет доступ к `http://backend:5000` (по имени сервиса)
- CORS настроены корректно в бэкенде (переменная `CORS_ORIGINS`)
- Проверьте логи: `docker compose logs -f frontend`

### Frontend выдает CORS ошибку
Убедитесь, что `CORS_ORIGINS` в `.env.docker` включает `http://localhost:5173`:
```env
CORS_ORIGINS=http://localhost:5173,https://acridgold.github.io
```
