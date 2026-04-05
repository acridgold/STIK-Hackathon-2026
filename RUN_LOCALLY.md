# ERP System Project

Этот проект представляет собой систему с бэкендом на **Python 3.11 (Flask/Gunicorn)** и базой данных **PostgreSQL 15**.

## 🚀 Быстрый запуск (через Docker)

Самый простой способ запустить всё окружение одной командой.

### Предварительные требования
* Установленный **Docker** и **Docker Compose**.
* На Fedora убедитесь, что ваш пользователь добавлен в группу `docker`: `sudo usermod -aG docker $USER` (потребуется перезагрузка).

### Инструкция
1.  **Настройте окружение:**
    Скопируйте пример файла настроек и отредактируйте его при необходимости:
    ```bash
    cp backend/.env.sample backend/.env
    ```
2.  **Запустите контейнеры:**
    ```bash
    docker-compose up --build
    ```
3.  **Проверьте работу:**
    Бэкенд будет доступен по адресу: `http://localhost:5000`

4. Остановка проекта
**Чтобы остановить и удалить контейнеры, сохранив данные в Volume:**
    ```bash
    docker compose down
    ```
---

## 🛠 Локальная разработка (без Docker)

Если вам нужно запустить бэкенд локально для отладки, используйте виртуальное окружение.

### Предварительные требования
* **Python 3.11**. На Fedora установите его командой:
    ```bash
    sudo dnf install python3.11
    ```

### Инструкция
1.  **Создайте и активируйте venv:**
    ```bash
    cd backend
    python3.11 -m venv .venv
    source .venv/bin/activate
    ```
2.  **Установите зависимости:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Запустите базу данных:**
    Вы можете запустить только контейнер с БД:
    ```bash
    docker-compose up db -d
    ```
4.  **Запустите приложение:**
    ```bash
    python app.py
    ```

---

## 🔍 Проверка работоспособности

### 1. Просмотр статуса контейнеров
Убедитесь, что все сервисы имеют статус `Up`:
```bash
docker ps
```

### 2. Проверка логов бэкенда
Если сервис не отвечает, проверьте логи на наличие ошибок подключения к БД или синтаксических ошибок Python:
```bash
docker compose logs -f backend
```
*Ожидаемый результат: сообщение `Listening at: http://0.0.0.0:5000`*.

### 2. Проверка маршрутов (API)
Чтобы узнать, какие URL-адреса доступны на сервере, выполните команду внутри контейнера бэкенда:
```bash
docker exec -it erp_backend_container flask routes
```

### 3. Проверка базы данных (PostgreSQL)
Проверьте, создались ли таблицы из файла `create_global_erp.sql`:
```bash
docker exec -it erp_db_container psql -U postgres -d global_erp_db -c "\dt"
```

### 4. Тестирование API
Выполните проверочный запрос к одному из эндпоинтов (замените на актуальный маршрут из вашего `app.py`):
```bash
# Пример для списка компаний
curl http://localhost:5000/api/companies
```
Ожидаемый результат: 
```bash
Endpoint                             Methods  Rule                                                         
-----------------------------------  -------  -------------------------------------------------------------
companies.create_company             POST     /api/companies                                               
companies.delete_company             DELETE   /api/companies/<company_id>                                  
companies.get_companies              GET      /api/companies                                               
companies.update_company             PUT      /api/companies/<company_id>                                  
courses.create_course                POST     /api/courses                                                 
courses.delete_course                DELETE   /api/courses/<course_id>                                     
courses.get_course                   GET      /api/courses/<course_id>                                     
courses.get_courses                  GET      /api/courses
 и т.д.
```

## 📁 Структура проекта
* [cite_start]`/backend` — Исходный код Python (Flask)[cite: 1].
* [cite_start]`/backend/requirements.txt` — Список зависимостей (Python 3.11+)[cite: 1].
* [cite_start]`docker-compose.yaml` — Конфигурация всей инфраструктуры[cite: 1].
* [cite_start]`create_global_erp.sql` — Скрипт инициализации БД[cite: 1].

---

## ⚠️ Решение частых проблем на Fedora

### Ошибка `docker-compose: command not found`
На свежих версиях Fedora (42+) используйте команду **без дефиса**: `docker compose`.
### Ошибка `Connection Refused` (Backend -> DB)
Убедитесь, что в вашем файле `.env` или коде бэкенда в качестве хоста базы данных указано имя сервиса `db`, а не `localhost`.
```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/global_erp_db
```
```
