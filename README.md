# STIK ERP — Система управления корпоративным обучением

Веб-приложение для планирования, расчета стоимости и мониторинга прогресса корпоративного обучения.

## Деплой:
https://acridgold.github.io/STIK-Hackathon-2026/

## 🚀 Быстрый старт

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
   * **Бэкенд (API)**: http://localhost:8080
   * **База данных**: localhost:5433 (PostgreSQL)

3. **Остановка проекта**
   Чтобы остановить и удалить контейнеры, сохранив данные в Volume:
   ```bash
   docker compose down
   ```


### Frontend (GitHub Pages)

```bash
# Из корня проекта
npm install          # Установка зависимостей frontend
npm run dev          # Локальная разработка на http://localhost:5173
npm run build        # Сборка для GitHub Pages
npm run deploy       # Деплой на GitHub Pages
```

```bash
# Или из папки frontend
cd frontend
npm install
npm run dev
npm run build
npm run deploy
```

Приложение доступно на **http://localhost:5173** при локальной разработке.

**Для публикации на GitHub Pages:**

1. **Добавить Deploy Key:**
   - Перейти в Settings репозитория → Deploy Keys
   - Нажать "Add deploy key"
   - Вставить ваш публичный SSH ключ (из `~/.ssh/id_rsa.pub`)
   - Поставить галочку "Allow write access"
   - Сохранить

2. **Развернуть:**
   ```bash
   npm run deploy
   ```

После деплоя приложение доступно по адресу:
```
https://acridgold.github.io/STIK-Hackathon-2026/
```

### Backend

Backend разворачивается отдельно без контейнеризации.
См. `backend/README.md` для инструкций.

---

## 📱 Frontend структура

```
frontend/
├── src/
│   ├── components/          # Компоненты UI
│   │   ├── Layout.jsx       # Основной макет
│   │   ├── Sidebar.jsx      # Боковое меню
│   │   └── ui/              # UI компоненты
│   ├── pages/               # Страницы приложения
│   │   ├── Dashboard.jsx    # Главный дашборд
│   │   ├── CoursesPage.jsx  # Управление курсами
│   │   ├── GroupsPage.jsx   # Список групп
│   │   └── GroupDetail.jsx  # Детали группы
│   ├── store/
│   │   └── useStore.js      # Zustand store
│   ├── api.js               # API клиент
│   ├── App.jsx              # Маршрутизация
│   └── index.css            # Глобальные стили
├── public/                  # Статические файлы
└── index.html               # HTML точка входа
```

---

## 🎯 Функционал

### Dashboard
- 📊 KPI карточки (4 основные метрики)
- 🚨 Обнаружение конфликтов расписания
- 📋 Таблица последних групп обучения
- 📊 Диаграмма Ганта (место для реализации)
- 🏢 Статистика по компаниям

### Управление курсами
- ✅ CRUD операции
- ✅ История цен
- ✅ Статистика использования

### Управление группами обучения
- ✅ Полный CRUD
- ✅ Управление участниками
- ✅ Вычисление прогресса
- ✅ Визуальные индикаторы статуса

### Расчет стоимости обучения
- Стоимость группы = цена курса × участники
- Стоимость спецификации = сумма групп
- Применение НДС (22%)

---

## 🔌 API Endpoints для фронтенда

**Базовый URL:** `http://localhost:8080/api`

### Курсы

```
GET    /courses              # Получить все курсы
GET    /courses/:id          # Получить курс по ID
POST   /courses              # Создать курс
PUT    /courses/:id          # Обновить курс
DELETE /courses/:id          # Удалить курс
```

**Структура Course:**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "duration_days": "number",
  "current_price": "number",
  "price_history": [
    {
      "price": "number",
      "effective_date": "ISO 8601 date",
      "notes": "string"
    }
  ]
}
```

### Группы обучения

```
GET    /groups               # Получить все группы
GET    /groups/:id           # Получить группу по ID
POST   /groups               # Создать группу
PUT    /groups/:id           # Обновить группу
DELETE /groups/:id           # Удалить группу
```

**Структура Group:**
```json
{
  "id": "string",
  "course_id": "string",
  "start_date": "ISO 8601 date",
  "end_date": "ISO 8601 date",
  "status": "planned|active|done",
  "participants": [
    {
      "employee_id": "string",
      "name": "string",
      "progress_percent": "number (0-100)"
    }
  ],
  "notes": "string"
}
```

### Сотрудники

```
GET    /employees            # Получить всех сотрудников
GET    /employees/:id        # Получить сотрудника по ID
POST   /employees            # Создать сотрудника
PUT    /employees/:id        # Обновить сотрудника
DELETE /employees/:id        # Удалить сотрудника
```

**Структура Employee:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "company_id": "string",
  "department": "string"
}
```

### Компании

```
GET    /companies            # Получить все компании
GET    /companies/:id        # Получить компанию по ID
POST   /companies            # Создать компанию
PUT    /companies/:id        # Обновить компанию
DELETE /companies/:id        # Удалить компанию
```

**Структура Company:**
```json
{
  "id": "string",
  "name": "string",
  "code": "string",
  "tax_id": "string"
}
```

### Спецификации (счета)

```
GET    /specifications       # Получить все спецификации
GET    /specifications/:id   # Получить спецификацию по ID
POST   /specifications       # Создать спецификацию
PUT    /specifications/:id   # Обновить спецификацию
DELETE /specifications/:id   # Удалить спецификацию
```

**Структура Specification:**
```json
{
  "id": "string",
  "company_id": "string",
  "groups_ids": ["string"],
  "number": "string",
  "date": "ISO 8601 date",
  "total": "number (с НДС)",
  "notes": "string"
}
```

### Обработка ошибок

Все ошибки возвращаются в формате:
```json
{
  "error": "Описание ошибки",
  "code": "ERROR_CODE"
}
```

---

## 🛠️ Технологический стек

**Frontend:**
- React 18
- React Router 6
- Zustand (состояние)
- Vite (сборка)
- Lucide React (иконки)
- date-fns (работа с датами)

**Стили:**
- CSS3 (Glassmorphism, CSS Grid, Flexbox)
- CSS переменные
- Адаптивный дизайн
- Поддержка PWA

---

## 📦 PWA Поддержка

Приложение поддерживает установку как PWA:
- Manifest файл: `/public/manifest.json`
- Favicon: `/public/favicon.svg`
- Robots и Sitemap для SEO

---

## 🔐 Переменные окружения

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:8080
```

---

## 📄 Лицензия

MIT License — см. [LICENSE](./LICENSE)
