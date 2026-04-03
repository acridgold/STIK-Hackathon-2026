/**
 * API SERVICE LAYER
 * ─────────────────────────────────────────────────────────────
 * Все обращения к бэкенду (Go + Gin) централизованы здесь.
 * Текущая версия MVP использует Zustand store (localStorage).
 * При подключении реального бэкенда — замените функции ниже
 * на реальные fetch/axios вызовы к соответствующим эндпоинтам.
 *
 * BACKEND ENDPOINTS (Go + Gin):
 *
 * Companies:
 *   GET    /api/companies
 *   POST   /api/companies
 *   PUT    /api/companies/:id
 *   DELETE /api/companies/:id
 *
 * Courses:
 *   GET    /api/courses
 *   POST   /api/courses
 *   PUT    /api/courses/:id
 *   DELETE /api/courses/:id
 *   GET    /api/courses/:id/price-history
 *
 * Employees:
 *   GET    /api/employees
 *   POST   /api/employees
 *   PUT    /api/employees/:id
 *   DELETE /api/employees/:id
 *
 * Groups:
 *   GET    /api/groups
 *   GET    /api/groups/:id
 *   POST   /api/groups
 *   PUT    /api/groups/:id
 *   DELETE /api/groups/:id
 *   POST   /api/groups/:id/participants
 *   DELETE /api/groups/:id/participants/:pid
 *   PATCH  /api/groups/:id/participants/:pid/progress
 *
 * Specifications:
 *   GET    /api/specifications
 *   GET    /api/specifications/:id
 *   POST   /api/specifications
 *   PUT    /api/specifications/:id
 *   DELETE /api/specifications/:id
 *
 * XML Integration:
 *   POST   /api/import/xml   (multipart/form-data, field: file)
 *
 * Analytics:
 *   GET    /api/analytics/companies        — сводка по компаниям
 *   GET    /api/analytics/schedule-conflicts — конфликты расписания
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

async function request(method, path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
    }
    return res.json()
}

export const api = {
    // Companies
    getCompanies: () => request('GET', '/companies'),
    createCompany: (data) => request('POST', '/companies', data),
    updateCompany: (id, data) => request('PUT', `/companies/${id}`, data),
    deleteCompany: (id) => request('DELETE', `/companies/${id}`),

    // Courses
    getCourses: () => request('GET', '/courses'),
    createCourse: (data) => request('POST', '/courses', data),
    updateCourse: (id, data) => request('PUT', `/courses/${id}`, data),
    deleteCourse: (id) => request('DELETE', `/courses/${id}`),
    getPriceHistory: (id) => request('GET', `/courses/${id}/price-history`),

    // Employees
    getEmployees: () => request('GET', '/employees'),
    createEmployee: (data) => request('POST', '/employees', data),
    updateEmployee: (id, data) => request('PUT', `/employees/${id}`, data),
    deleteEmployee: (id) => request('DELETE', `/employees/${id}`),

    // Groups
    getGroups: () => request('GET', '/groups'),
    getGroup: (id) => request('GET', `/groups/${id}`),
    createGroup: (data) => request('POST', '/groups', data),
    updateGroup: (id, data) => request('PUT', `/groups/${id}`, data),
    deleteGroup: (id) => request('DELETE', `/groups/${id}`),
    addParticipant: (groupId, employeeId) =>
        request('POST', `/groups/${groupId}/participants`, { employeeId }),
    removeParticipant: (groupId, pid) =>
        request('DELETE', `/groups/${groupId}/participants/${pid}`),
    updateProgress: (groupId, pid, progress) =>
        request('PATCH', `/groups/${groupId}/participants/${pid}/progress`, { progress }),

    // Specifications
    getSpecifications: () => request('GET', '/specifications'),
    getSpecification: (id) => request('GET', `/specifications/${id}`),
    createSpecification: (data) => request('POST', '/specifications', data),
    updateSpecification: (id, data) => request('PUT', `/specifications/${id}`, data),
    deleteSpecification: (id) => request('DELETE', `/specifications/${id}`),

    // XML import
    importXML: (file) => {
        const form = new FormData()
        form.append('file', file)
        return fetch(`${BASE_URL}/import/xml`, { method: 'POST', body: form })
            .then(r => r.json())
    },

    // Analytics
    getCompanyAnalytics: () => request('GET', '/analytics/companies'),
    getScheduleConflicts: () => request('GET', '/analytics/schedule-conflicts'),
}

export default api