/**
 * groupService.js
 *
 * Отвечает за работу с сущностями Group и Participant.
 *
 * JSON от бэкенда (snake_case) → объект стора (camelCase)
 *
 * Бэкенд возвращает группу:
 * {
 *   "id": 1,
 *   "course_id": 1,
 *   "course_name": "Python для начинающих",   ← для отображения
 *   "price_per_person": 15000.00,
 *   "start_date": "2026-03-01",
 *   "end_date": "2026-03-05",
 *   "status": "planned",
 *   "specification_id": null,
 *   "participant_count": 3,
 *   "group_cost": 45000.00,
 *   "avg_progress": 33.3,
 *   "participants": [
 *     { "id": 1, "employee_id": 3, "full_name": "Иванов И.И.", "progress": 50.0 }
 *   ]
 * }
 *
 * Бэкенд возвращает участника (POST/PATCH):
 * {
 *   "id": 1,
 *   "group_id": 1,
 *   "employee_id": 3,
 *   "full_name": "Иванов Иван Иванович",
 *   "progress": 0.0
 * }
 *
 * Стор хранит группу:
 * {
 *   id: "1",
 *   courseId: "1",
 *   startDate: "2026-03-01",
 *   endDate: "2026-03-05",
 *   status: "planned",
 *   specId: null,
 *   participants: [
 *     { id: "1", groupId: "1", employeeId: "3", progress: 50 }
 *   ]
 * }
 *
 * Примечание:
 * - course_name, group_cost, avg_progress — вычисляемые поля, которые стор
 *   считает сам через calcGroupCost / calcGroupProgress. В стор НЕ кладём.
 * - specId в сторе = specification_id с бэкенда.
 * - Статусы бэкенда: planned / in_progress / completed / cancelled
 *   Статусы стора:   planned / active / done / paused
 *   Маппинг см. ниже в STATUS_MAP.
 */

import { api } from '../api.js'

// ─── Маппинг статусов бэкенд → стор ─────────────────────────────────────────

const STATUS_FROM_BACKEND = {
    planned:     'planned',
    in_progress: 'active',
    completed:   'done',
    cancelled:   'paused',
}

const STATUS_TO_BACKEND = {
    planned: 'planned',
    active:  'in_progress',
    done:    'completed',
    paused:  'cancelled',
}

// ─── Парсинг участника ───────────────────────────────────────────────────────

function parseParticipant(raw) {
    return {
        id:         String(raw.id),
        groupId:    String(raw.group_id),
        employeeId: String(raw.employee_id),
        progress:   Number(raw.progress ?? 0),
    }
}

// ─── Парсинг группы ──────────────────────────────────────────────────────────

function parseGroup(raw) {
    return {
        id:           String(raw.id),
        courseId:     String(raw.course_id),
        startDate:    raw.start_date,
        endDate:      raw.end_date,
        status:       STATUS_FROM_BACKEND[raw.status] ?? raw.status,
        specId:       raw.specification_id ? String(raw.specification_id) : null,
        participants: (raw.participants ?? []).map(parseParticipant),
    }
}

// ─── Подготовка данных стора → тело запроса к бэкенду ───────────────────────

function toGroupPayload(data) {
    const payload = {}
    if (data.courseId  !== undefined) payload.course_id          = Number(data.courseId)
    if (data.startDate !== undefined) payload.start_date         = data.startDate
    if (data.endDate   !== undefined) payload.end_date           = data.endDate
    if (data.status    !== undefined) payload.status             = STATUS_TO_BACKEND[data.status] ?? data.status
    if (data.specId    !== undefined) payload.specification_id   = data.specId ? Number(data.specId) : null
    return payload
}

// ─── Публичный API сервиса ───────────────────────────────────────────────────

export const groupService = {
    /** GET /groups → Group[] */
    async getAll() {
        const data = await api.getGroups()
        return data.map(parseGroup)
    },

    /** GET /groups/:id → Group */
    async getById(id) {
        const data = await api.getGroup(id)
        return parseGroup(data)
    },

    /**
     * POST /groups
     * payload: { courseId, startDate, endDate, status, specId? }
     * → Group
     */
    async create(payload) {
        const data = await api.createGroup(toGroupPayload(payload))
        return parseGroup(data)
    },

    /**
     * PUT /groups/:id
     * payload: { courseId?, startDate?, endDate?, status?, specId? }
     * → Group
     */
    async update(id, payload) {
        const data = await api.updateGroup(id, toGroupPayload(payload))
        return parseGroup(data)
    },

    /** DELETE /groups/:id → { message } */
    async delete(id) {
        return api.deleteGroup(id)
    },

    /**
     * POST /groups/:groupId/participants
     * Добавить участника в группу.
     * employeeId — строковый id из стора
     * → Participant
     */
    async addParticipant(groupId, employeeId) {
        const data = await api.addParticipant(groupId, Number(employeeId))
        return parseParticipant(data)
    },

    /**
     * DELETE /groups/:groupId/participants/:participantId
     * → { message }
     */
    async removeParticipant(groupId, participantId) {
        return api.removeParticipant(groupId, participantId)
    },

    /**
     * PATCH /groups/:groupId/participants/:participantId/progress
     * progress: число 0–100
     * → Participant
     */
    async updateProgress(groupId, participantId, progress) {
        const data = await api.updateProgress(groupId, participantId, progress)
        return parseParticipant(data)
    },
}
