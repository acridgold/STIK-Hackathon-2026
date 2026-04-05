```markdown
# 5. Backend-документация

**Компонент:** Серверная часть  
**Язык:** Python 3.11+  
**Фреймворк:** Flask 3.1.3  
**Валидация:** Pydantic 2.12.5  
**Архитектура:** Репозитории + ABC интерфейсы (чистая архитектура)  
**Хранение данных:** In-Memory (словари) — для демо на хакатоне  
**Деплой:** Railway (Gunicorn/Uvicorn)  
**Статус:** ✅ Полностью реализован

**Дата:** 05.04.2026  
**Автор:** Backend-разработчик + Аналитик

---

## 1. Общее описание

Backend-сервер реализован с использованием:
- **Flask 3.1.3** — лёгкий веб-фреймворк
- **Pydantic v2** — валидация входящих данных с автоматической генерацией ошибок
- **Repository pattern** — чистая архитектура (разделение интерфейсов и реализации)
- **ABC интерфейсы** — контракты для всех репозиториев
- **In-Memory хранение** — идеально для демо на хакатоне (не требует PostgreSQL)

**Особенности:**
- Singleton-репозитории для единого состояния между запросами
- Автоматические расчёты: стоимость группы, прогресс, НДС (22%)
- История цен курсов (при изменении цены)
- Валидация всех входящих запросов с человекочитаемыми ошибками
- Запрет лишних полей (`extra="forbid"`)
- CORS настроен для взаимодействия с фронтендом
- Логирование всех запросов (`before_request`)

---

## 2. Технологический стек

| Компонент | Технология | Версия | Назначение |
|-----------|------------|--------|------------|
| Язык | Python | 3.11+ | Основной язык |
| Web-фреймворк | Flask | 3.1.3 | REST API |
| CORS | Flask-CORS | 6.0.2 | Разрешение запросов с фронта |
| Валидация | Pydantic | 2.12.5 | Схемы в `schemas/` |
| Архитектура | Repository + ABC | — | Чистая архитектура |
| Хранение | In-Memory (dict) | — | Для хакатона |
| ASGI-сервер | Uvicorn | — | Production (Railway) |
| WSGI-сервер | Gunicorn | 23.0.0 | Production (Railway) |
| Деплой | Railway | — | Облачный хостинг |

---

## 3. Структура проекта (backend/)

```
backend/
│
├── repositories/                    # Слой доступа к данным
│   ├── __init__.py
│   ├── base.py                      # ABC интерфейсы
│   ├── company_repository.py        # Компании (In-Memory)
│   ├── course_repository.py         # Курсы + история цен
│   ├── employee_repository.py       # Сотрудники
│   ├── group_repository.py          # Группы + участники + расчёты
│   ├── participant_repository.py    # Участники (альтернативный)
│   └── specification_repository.py  # Спецификации + НДС 22%
│
├── routes/                          # API эндпоинты
│   ├── companies.py                 # CRUD компаний
│   ├── courses.py                   # CRUD курсов + история цен
│   ├── employees.py                 # CRUD сотрудников
│   ├── groups.py                    # CRUD групп + участники + прогресс
│   ├── import.py                    # XML-интеграция
│   └── specifications.py            # CRUD спецификаций
│
├── schemas/                         # Pydantic схемы валидации
│   ├── __init__.py
│   ├── company_schema.py
│   ├── course_schema.py
│   ├── employee_schema.py
│   ├── group_schema.py
│   ├── participant_schema.py
│   └── specification_schema.py
│
├── utils/
│   ├── __init__.py
│   └── app.py                       # Инициализация Flask
│
├── app.py                           # Точка входа (альтернативная)
├── railway.json                     # Конфигурация деплоя на Railway
├── BACKEND_INTEGRATION.md
└── requirements.txt                 # Python зависимости
```

---

## 4. Точка входа — `app.py`

```python
from flask import Flask, request
from flask_cors import CORS

from routes.companies import companies_bp
from routes.courses import courses_bp
from routes.employees import employees_bp
from routes.groups import groups_bp
from routes.specifications import specifications_bp

app = Flask(__name__)
CORS(app)                            # Разрешаем запросы с фронтенда

app.json.ensure_ascii = False        # Поддержка кириллицы в JSON

# Регистрация blueprints с префиксами
app.register_blueprint(companies_bp,      url_prefix="/api/companies")
app.register_blueprint(courses_bp,        url_prefix="/api/courses")
app.register_blueprint(employees_bp,      url_prefix="/api/employees")
app.register_blueprint(groups_bp,         url_prefix="/api/groups")
app.register_blueprint(specifications_bp, url_prefix="/api/specifications")

@app.before_request
def log_request():
    print(f"{request.method} {request.path}")   # Логирование всех запросов

if __name__ == "__main__":
    app.run(debug=True, port=8080)
```

**Особенности:**
- Все API эндпоинты имеют префикс `/api/`
- CORS настроен — фронтенд может обращаться с любого домена
- Кириллица в JSON не экранируется (`ensure_ascii=False`)
- Логирование каждого запроса в консоль

---

## 5. Деплой на Railway — `railway.json`

```json
{
  "$schema": "https://railway.app/railway-schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app:app --host 0.0.0.0 --port $PORT"
  }
}
```

**Что это значит:**
- **NIXPACKS** — автоматическое определение Python-проекта
- **Uvicorn** — ASGI-сервер (хотя Flask WSGI, Uvicorn тоже работает)
- Порт берётся из переменной окружения `$PORT` (Railway подставляет сам)

---

## 6. Зависимости — `requirements.txt`

```
Flask==3.1.3
flask-cors==6.0.2
pydantic==2.12.5
gunicorn==23.0.0          # WSGI-сервер (альтернатива)
uvicorn==0.34.0           # ASGI-сервер (используется в railway.json)
marshmallow==4.0.1        # Альтернативная валидация (не используется)
...
```

---

## 7. Pydantic-схемы валидации 

| Файл | Основные модели | Особенности |
|------|----------------|-------------|
| `company_schema.py` | `CompanyCreate`, `CompanyUpdate` | `code` — 2–4 символа, только буквы/цифры |
| `course_schema.py` | `CourseCreate`, `CourseUpdate` | `duration`, `price` > 0 |
| `employee_schema.py` | `EmployeeCreate`, `EmployeeUpdate` | `email` — валидация через `EmailStr` |
| `group_schema.py` | `GroupCreate`, `GroupUpdate`, `ParticipantAdd`, `ParticipantProgressUpdate` | `progress` 0–100% |
| `participant_schema.py` | `ParticipantAdd`, `ParticipantProgressUpdate`, `ParticipantResponse` | Кастомный валидатор `employee_id_not_empty` |
| `specification_schema.py` | `SpecificationCreate`, `SpecificationUpdate` | `group_ids` — список ID групп |

**Общее для всех схем:**
- `extra="forbid"` — запрет лишних полей
- `str_strip_whitespace=True` — авто-обрезка пробелов (где указано)

---

## 8. API-эндпоинты (полный список)

### 8.1 Компании — `/api/companies`

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/companies` | Список всех компаний |
| POST | `/api/companies` | Создание компании |
| PUT | `/api/companies/<id>` | Обновление |
| DELETE | `/api/companies/<id>` | Удаление |

### 8.2 Курсы — `/api/courses`

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/courses` | Список курсов |
| POST | `/api/courses` | Создание |
| PUT | `/api/courses/<id>` | Обновление |
| DELETE | `/api/courses/<id>` | Удаление |
| GET | `/api/courses/<id>/price-history` | История цен |

### 8.3 Сотрудники — `/api/employees`

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/employees` | Список сотрудников |
| POST | `/api/employees` | Создание |
| PUT | `/api/employees/<id>` | Обновление |
| DELETE | `/api/employees/<id>` | Удаление |

### 8.4 Учебные группы — `/api/groups` (ОСНОВНОЙ)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/groups` | Список всех групп (с расчётами) |
| GET | `/api/groups/<id>` | Детали группы |
| POST | `/api/groups` | Создание |
| PUT | `/api/groups/<id>` | Обновление |
| DELETE | `/api/groups/<id>` | Удаление |
| POST | `/api/groups/<id>/participants` | Добавить участника |
| DELETE | `/api/groups/<id>/participants/<pid>` | Удалить участника |
| PATCH | `/api/groups/<id>/participants/<pid>/progress` | Обновить прогресс |

### 8.5 Спецификации — `/api/specifications`

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/specifications` | Список спецификаций |
| GET | `/api/specifications/<id>` | Детали + расчёт НДС |
| POST | `/api/specifications` | Создание |
| PUT | `/api/specifications/<id>` | Обновление |
| DELETE | `/api/specifications/<id>` | Удаление |

---

## 9. Бизнес-логика (в репозиториях)

### 9.1 Расчёт стоимости группы

**Где:** `repositories/group_repository.py` → метод `_enrich()`

```python
group_cost = price_per_person * participant_count
```

### 9.2 Расчёт среднего прогресса

```python
avg_progress = sum(m["progress"] for m in members) / participant_count if participant_count > 0 else 0
```

### 9.3 Расчёт спецификации (НДС 22%)

**Где:** `repositories/specification_repository.py`

```python
VAT_RATE = 0.22  

subtotal = sum(group.get("group_cost", 0) for gid in group_ids)
vat = round(subtotal * VAT_RATE, 2)
total = round(subtotal + vat, 2)
```

### 9.4 История цен

**Где:** `repositories/course_repository.py` → метод `update()`

При изменении цены автоматически добавляется запись в `price_history` с временной меткой.

---

## 10. Обработка ошибок

| HTTP Status | Ситуация | Пример ответа |
|-------------|----------|---------------|
| 200 | Успех | Данные |
| 201 | Создано | Созданный объект |
| 400 | Ошибка валидации Pydantic | `{"error": "Validation error", "details": [...]}` |
| 404 | Объект не найден | `{"message": "Group not found"}` |
| 500 | Внутренняя ошибка | `{"error": "Internal server error"}` |

**Пример полной ошибки валидации (400):**
```json
{
    "error": "Validation error",
    "details": [
        {
            "type": "less_than_equal",
            "loc": ["progress"],
            "msg": "Input should be less than or equal to 100",
            "input": 150
        }
    ]
}
```

---

## 11. Запуск

### 11.1 Локальный запуск (Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Сервер запустится на `http://localhost:8080`

### 11.2 Запуск через Uvicorn (как на Railway)

```bash
uvicorn app:app --host 0.0.0.0 --port 8080
```

### 11.3 Деплой на Railway

```bash
railway login
railway up
```

---
