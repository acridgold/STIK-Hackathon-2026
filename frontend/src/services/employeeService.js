/**
 * employeeService.js
 *
 * Отвечает за работу с сущностью Employee.
 *
 * JSON от бэкенда (snake_case) → объект стора (camelCase)
 *
 * Бэкенд возвращает:
 * {
 *   "id": 1,
 *   "full_name": "Иванов Иван Иванович",
 *   "company_id": 1,
 *   "company_name": "Ромашка",   ← денормализованное поле для отображения
 *   "email": "ivanov@mail.ru"    ← может быть null
 * }
 *
 * При дубликате POST дополнительно возвращает:
 * {
 *   ...поля сотрудника...,
 *   "warning": "Найдено 1 сотрудник(ов) с такими же данными в этой компании.",
 *   "similar": [ ...массив похожих сотрудников... ]
 * }
 *
 * Стор хранит:
 * {
 *   id: "1",
 *   fullName: "Иванов Иван Иванович",
 *   companyId: "1",
 *   email: "ivanov@mail.ru"
 * }
 *
 * Примечание: company_name не хранится в сторе — он берётся через join
 * с массивом companies при отображении (так же как сейчас работает GroupsPage).
 */

import { api } from '../api.js'

// ─── Парсинг ответа бэкенда → формат стора ──────────────────────────────────

function parseEmployee(raw) {
    return {
        id:        String(raw.id),
        fullName:  raw.full_name,
        companyId: String(raw.company_id),
        email:     raw.email ?? null,
    }
}

// ─── Подготовка данных стора → тело запроса к бэкенду ───────────────────────

function toPayload(data) {
    const payload = {}
    if (data.fullName  !== undefined) payload.full_name  = data.fullName
    if (data.companyId !== undefined) payload.company_id = Number(data.companyId)
    if (data.email     !== undefined) payload.email      = data.email || null
    return payload
}

// ─── Публичный API сервиса ───────────────────────────────────────────────────

export const employeeService = {
    /** GET /employees → Employee[] */
    async getAll() {
        const data = await api.getEmployees()
        return data.map(parseEmployee)
    },

    /**
     * POST /employees
     * payload: { fullName, companyId, email? }
     *
     * Возвращает:
     * {
     *   employee: Employee,          — всегда
     *   warning?: string,            — только если найден дубликат
     *   similar?: Employee[]         — только если найден дубликат
     * }
     *
     * Использование в компоненте:
     *   const { employee, warning, similar } = await employeeService.create(form)
     *   if (warning) toast(warning, 'warning')
     */
    async create(payload) {
        const data = await api.createEmployee(toPayload(payload))

        const result = { employee: parseEmployee(data) }

        if (data.warning) {
            result.warning = data.warning
            result.similar = (data.similar || []).map(parseEmployee)
        }

        return result
    },

    /**
     * PUT /employees/:id
     * payload: { fullName?, companyId?, email? }
     * → Employee
     */
    async update(id, payload) {
        const data = await api.updateEmployee(id, toPayload(payload))
        return parseEmployee(data)
    },

    /** DELETE /employees/:id → { message } */
    async delete(id) {
        return api.deleteEmployee(id)
    },
}
