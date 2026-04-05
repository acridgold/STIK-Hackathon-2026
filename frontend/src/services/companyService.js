/**
 * companyService.js
 *
 * Отвечает за работу с сущностью Company.
 *
 * JSON от бэкенда (snake_case) → объект стора (camelCase)
 *
 * Бэкенд возвращает:
 * {
 *   "id": 1,
 *   "company_code": "ROM",
 *   "company_name": "Ромашка"
 * }
 *
 * Стор хранит:
 * {
 *   id: "1",
 *   code: "ROM",
 *   name: "Ромашка"
 * }
 */

import { api } from '../api.js'

// ─── Парсинг ответа бэкенда → формат стора ──────────────────────────────────

function parseCompany(raw) {
    return {
        id:   String(raw.id),
        code: raw.company_code,
        name: raw.company_name,
    }
}

// ─── Подготовка данных стора → тело запроса к бэкенду ───────────────────────

function toPayload(data) {
    return {
        company_code: data.code ?? data.company_code,
        company_name: data.name ?? data.company_name,
    }
}

// ─── Публичный API сервиса ───────────────────────────────────────────────────

export const companyService = {
    /** GET /companies → Company[] */
    async getAll() {
        const data = await api.getCompanies()
        return data.map(parseCompany)
    },

    /**
     * POST /companies
     * payload: { code, name }
     * → Company
     */
    async create(payload) {
        const data = await api.createCompany(toPayload(payload))
        return parseCompany(data)
    },

    /**
     * PUT /companies/:id
     * payload: { code?, name? }
     * → Company
     */
    async update(id, payload) {
        const data = await api.updateCompany(id, toPayload(payload))
        return parseCompany(data)
    },

    /** DELETE /companies/:id → { message } */
    async delete(id) {
        return api.deleteCompany(id)
    },
}
