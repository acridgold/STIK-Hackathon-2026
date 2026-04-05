/**
 * courseService.js
 *
 * Отвечает за работу с сущностью Course.
 *
 * JSON от бэкенда (snake_case) → объект стора (camelCase)
 *
 * Бэкенд возвращает курс:
 * {
 *   "id": 1,
 *   "course_name": "Python для начинающих",
 *   "description": "Базовый курс",
 *   "duration_days": 5,
 *   "price_per_person": 15000.00
 * }
 *
 * Бэкенд возвращает историю цен GET /courses/:id/price-history:
 * [
 *   { "id": 1, "course_id": 1, "price": 12000.00, "valid_from": "2025-01-01", "valid_to": "2025-12-31" },
 *   { "id": 2, "course_id": 1, "price": 15000.00, "valid_from": "2026-01-01", "valid_to": null }
 * ]
 *
 * Стор хранит курс:
 * {
 *   id: "1",
 *   name: "Python для начинающих",
 *   description: "Базовый курс",
 *   durationDays: 5,
 *   priceHistory: [
 *     { price: 12000, validFrom: "2025-01-01" },
 *     { price: 15000, validFrom: "2026-01-01" }
 *   ]
 * }
 *
 * Примечание: стор использует priceHistory для времязависимых расчётов.
 * Функции getPriceOnDate / getCurrentPrice уже умеют с ней работать.
 */

import { api } from '../api.js'

// ─── Парсинг истории цен ─────────────────────────────────────────────────────

function parsePriceHistory(historyArray) {
    if (!Array.isArray(historyArray) || historyArray.length === 0) return []
    return historyArray
        .map(h => ({
            price:     Number(h.price),
            validFrom: h.valid_from,
        }))
        .sort((a, b) => a.validFrom < b.validFrom ? -1 : 1)
}

// ─── Парсинг курса без истории (только текущая цена) ────────────────────────
// Используется при GET /courses — бэкенд отдаёт price_per_person как актуальную цену.
// История подгружается отдельно через GET /courses/:id/price-history.

function parseCourseBasic(raw) {
    return {
        id:           String(raw.id),
        name:         raw.course_name,
        description:  raw.description ?? '',
        durationDays: Number(raw.duration_days),
        // Оборачиваем текущую цену в priceHistory — формат стора
        priceHistory: [
            { price: Number(raw.price_per_person), validFrom: '2024-01-01' }
        ],
    }
}

// ─── Парсинг курса с историей цен ───────────────────────────────────────────

function parseCourseWithHistory(raw, historyArray) {
    return {
        id:           String(raw.id),
        name:         raw.course_name,
        description:  raw.description ?? '',
        durationDays: Number(raw.duration_days),
        priceHistory: parsePriceHistory(historyArray),
    }
}

// ─── Подготовка данных стора → тело запроса к бэкенду ───────────────────────

function toPayload(data) {
    const payload = {}
    if (data.name         !== undefined) payload.course_name     = data.name
    if (data.description  !== undefined) payload.description     = data.description
    if (data.durationDays !== undefined) payload.duration_days   = data.durationDays
    // При обновлении цены передаём новое значение; бэкенд сам создаёт запись в price_history
    if (data.price        !== undefined) payload.price_per_person = data.price
    return payload
}

// ─── Публичный API сервиса ───────────────────────────────────────────────────

export const courseService = {
    /**
     * GET /courses → Course[]
     * Загружает все курсы с базовой ценой (без полной истории).
     * Для отображения в таблице этого достаточно.
     */
    async getAll() {
        const data = await api.getCourses()
        return data.map(parseCourseBasic)
    },

    /**
     * GET /courses + GET /courses/:id/price-history для каждого курса
     * Загружает курсы с полной историей цен.
     * Используй там, где важна времязависимость (расчёт стоимости групп).
     */
    async getAllWithHistory() {
        const courses = await api.getCourses()
        const result = await Promise.all(
            courses.map(async (raw) => {
                const history = await api.getPriceHistory(raw.id)
                return parseCourseWithHistory(raw, history)
            })
        )
        return result
    },

    /**
     * POST /courses
     * payload: { name, description?, durationDays, price }
     * → Course
     */
    async create(payload) {
        const data = await api.createCourse(toPayload(payload))
        return parseCourseBasic(data)
    },

    /**
     * PUT /courses/:id
     * payload: { name?, description?, durationDays?, price? }
     * Если price изменился — бэкенд создаёт новую запись в price_history.
     * → Course
     */
    async update(id, payload) {
        const data = await api.updateCourse(id, toPayload(payload))
        // После обновления перезагружаем историю, чтобы стор был актуальным
        const history = await api.getPriceHistory(id)
        return parseCourseWithHistory(data, history)
    },

    /** DELETE /courses/:id → { message } */
    async delete(id) {
        return api.deleteCourse(id)
    },

    /**
     * GET /courses/:id/price-history
     * → { price, validFrom }[]  — формат стора (priceHistory)
     */
    async getPriceHistory(id) {
        const data = await api.getPriceHistory(id)
        return parsePriceHistory(data)
    },
}
