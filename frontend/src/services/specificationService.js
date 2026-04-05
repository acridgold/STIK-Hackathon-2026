/**
 * specificationService.js
 *
 * Отвечает за работу с сущностью Specification.
 *
 * JSON от бэкенда (snake_case) → объект стора (camelCase)
 *
 * Бэкенд возвращает:
 * {
 *   "id": 1,
 *   "doc_number": "СП-2026-001",
 *   "doc_date": "2026-01-15",
 *   "company_id": 1,
 *   "company_name": "Ромашка",      ← денормализованное поле для отображения
 *   "groups": [
 *     { "id": 1, "course_name": "Python", "participant_count": 3, "group_cost": 45000 }
 *   ],
 *   "subtotal": 45000.00,           ← сумма без НДС
 *   "vat_amount": 9900.00,          ← НДС 22%
 *   "total_with_vat": 54900.00      ← итого с НДС
 * }
 *
 * Стор хранит:
 * {
 *   id: "1",
 *   date: "2026-01-15",
 *   number: "СП-2026-001",
 *   companyId: "1",
 *   groupIds: ["1"]
 * }
 *
 * Примечание:
 * - subtotal / vat_amount / total_with_vat стор вычисляет сам через calcSpecTotals.
 *   В стор НЕ кладём — это вычисляемые поля.
 * - groupIds формируется из массива groups[].id ответа бэкенда.
 */

import { api } from '../api.js'

// ─── Парсинг ответа бэкенда → формат стора ──────────────────────────────────

function parseSpecification(raw) {
    return {
        id:        String(raw.id),
        date:      raw.doc_date,
        number:    raw.doc_number,
        companyId: String(raw.company_id),
        // Извлекаем id групп из вложенного массива
        groupIds:  (raw.groups ?? []).map(g => String(g.id)),
    }
}

// ─── Подготовка данных стора → тело запроса к бэкенду ───────────────────────

function toPayload(data) {
    const payload = {}
    if (data.date      !== undefined) payload.doc_date   = data.date
    if (data.number    !== undefined) payload.doc_number  = String(data.number)
    if (data.companyId !== undefined) payload.company_id  = Number(data.companyId)
    return payload
}

// ─── Публичный API сервиса ───────────────────────────────────────────────────

export const specificationService = {
    /** GET /specifications → Specification[] */
    async getAll() {
        const data = await api.getSpecifications()
        return data.map(parseSpecification)
    },

    /** GET /specifications/:id → Specification */
    async getById(id) {
        const data = await api.getSpecification(id)
        return parseSpecification(data)
    },

    /**
     * POST /specifications
     * payload: { date, number, companyId }
     * → Specification
     */
    async create(payload) {
        const data = await api.createSpecification(toPayload(payload))
        return parseSpecification(data)
    },

    /**
     * PUT /specifications/:id
     * payload: { date?, number?, companyId? }
     * → Specification
     */
    async update(id, payload) {
        const data = await api.updateSpecification(id, toPayload(payload))
        return parseSpecification(data)
    },

    /** DELETE /specifications/:id → { message } */
    async delete(id) {
        return api.deleteSpecification(id)
    },
}
