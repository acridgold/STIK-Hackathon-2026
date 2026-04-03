# 🚀 Деплой на GitHub Pages

## Конфигурация

Проект настроен для автоматического деплоя на GitHub Pages через `gh-pages`.

### Основные параметры:

**package.json:**
```json
{
  "homepage": "https://acridgold.github.io/STIK-Hackathon-2026/"
}
```

**vite.config.js:**
```javascript
base: '/STIK-Hackathon-2026/'
```

---

## 📦 Установка зависимостей

```bash
# Из корня проекта
npm install

# Или из папки frontend
cd frontend
npm install
```

Пакет `gh-pages` будет установлен как dev dependency.

---

## 🔧 Скрипты для деплоя

### Вариант 1: Автоматический деплой

```bash
# Из корня проекта
npm run deploy
```

Команда выполняет:
1. Собирает приложение (`npm run build`)
2. Пушит содержимое `dist/` в branch `gh-pages` на GitHub

### Вариант 2: Деплой с кастомным сообщением

```bash
# Из корня проекта
npm run deploy:gh-pages
```

Тоже самое, но с кастомным сообщением коммита:
```
Deploy: GitHub Pages
```

### Вариант 3: Полностью ручной

```bash
# Из корня проекта
npm run build
gh-pages -d frontend/dist
```

---

## ✅ Проверка успешного деплоя

После выполнения одной из команд деплоя:

1. Перейдите в GitHub репозитория
2. Откройте Settings → Pages
3. Убедитесь что source установлен на `gh-pages` branch
4. Приложение будет доступно по адресу:
   ```
   https://acridgold.github.io/STIK-Hackathon-2026/
   ```

---

## 🔄 Рабочий процесс разработки

```bash
# 1. Локальная разработка
npm run dev

# 2. Тестирование продакшн-сборки локально
npm run build
npm run preview

# 3. Деплой на GitHub Pages
npm run deploy
```

---

## 📝 Переменные окружения для деплоя

Убедитесь что в `.env` или `.env.production` установлены правильные переменные:

```env
# .env (локальная разработка)
VITE_API_URL=http://localhost:8080

# .env.production (продакшн)
VITE_API_URL=https://your-backend-api.com
```

---

## 🐛 Решение проблем

### Проблема: Приложение не загружается после деплоя

**Решение:** Проверьте что в `vite.config.js` правильно установлен `base`:
```javascript
base: '/STIK-Hackathon-2026/'
```

### Проблема: GitHub выдает ошибку при деплое

**Решение:** Убедитесь что:
1. Установлена последняя версия Node.js
2. Установлены все зависимости: `npm install`
3. GitHub Pages включены в Settings репозитория
4. У вас есть доступ на запись в репозиторий

### Проблема: API запросы не работают после деплоя

**Решение:** Установите правильный URL бэкенда в `.env.production`:
```env
VITE_API_URL=https://your-backend-api.com
```

---

## 📚 Дополнительные ресурсы

- [gh-pages документация](https://github.com/tschaub/gh-pages)
- [GitHub Pages документация](https://docs.github.com/en/pages)
- [Vite build конфигурация](https://vitejs.dev/config/)

---

## 🔐 GitHub Tokens (опционально)

Для автоматизации деплоя через GitHub Actions можно использовать GitHub tokens.

Примеры:
- Personal Access Token (PAT)
- GitHub App tokens

Подробнее в документации GitHub Actions.
