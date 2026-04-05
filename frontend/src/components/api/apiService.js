/**
 * API Service — JSON REST
 * Работает с Flask бэкендом напрямую через JSON
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const headers = { 'Content-Type': 'application/json' }

async function request(method, path, body) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            ...(body ? { body: JSON.stringify(body) } : {})
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            return { success: false, error: err.message || `HTTP ${res.status}` }
        }
        const data = await res.json()
        return { success: true, data }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// ── GROUPS ────────────────────────────────────────────────
export const fetchGroups    = ()         => request('GET',    '/api/groups')
export const fetchGroup     = (id)       => request('GET',    `/api/groups/${id}`)
export const createGroup    = (data)     => request('POST',   '/api/groups', data)
export const updateGroup    = (id, data) => request('PUT',    `/api/groups/${id}`, data)
export const deleteGroup    = (id)       => request('DELETE', `/api/groups/${id}`)

// ── PARTICIPANTS ──────────────────────────────────────────
export const addParticipant     = (groupId, employeeId) =>
    request('POST',   `/api/groups/${groupId}/participants`, { employee_id: employeeId })

export const removeParticipant  = (groupId, participantId) =>
    request('DELETE', `/api/groups/${groupId}/participants/${participantId}`)

export const updateProgress     = (groupId, participantId, progress) =>
    request('PATCH',  `/api/groups/${groupId}/participants/${participantId}/progress`, { progress })

// ── COURSES ───────────────────────────────────────────────
export const fetchCourses   = ()         => request('GET',    '/api/courses')
export const fetchCourse    = (id)       => request('GET',    `/api/courses/${id}`)
export const createCourse   = (data)     => request('POST',   '/api/courses', data)
export const updateCourse   = (id, data) => request('PUT',    `/api/courses/${id}`, data)
export const deleteCourse   = (id)       => request('DELETE', `/api/courses/${id}`)

// ── EMPLOYEES ─────────────────────────────────────────────
export const fetchEmployees  = ()         => request('GET',    '/api/employees')
export const createEmployee  = (data)     => request('POST',   '/api/employees', data)
export const updateEmployee  = (id, data) => request('PUT',    `/api/employees/${id}`, data)
export const deleteEmployee  = (id)       => request('DELETE', `/api/employees/${id}`)

// ── COMPANIES ─────────────────────────────────────────────
export const fetchCompanies  = ()         => request('GET',    '/api/companies')
export const createCompany   = (data)     => request('POST',   '/api/companies', data)
export const updateCompany   = (id, data) => request('PUT',    `/api/companies/${id}`, data)
export const deleteCompany   = (id)       => request('DELETE', `/api/companies/${id}`)

// ── SPECIFICATIONS ────────────────────────────────────────
export const fetchSpecs     = ()         => request('GET',    '/api/specifications')
export const fetchSpec      = (id)       => request('GET',    `/api/specifications/${id}`)
export const createSpec     = (data)     => request('POST',   '/api/specifications', data)
export const updateSpec     = (id, data) => request('PUT',    `/api/specifications/${id}`, data)
export const deleteSpec     = (id)       => request('DELETE', `/api/specifications/${id}`)

// ── SYNC ALL ──────────────────────────────────────────────
/**
 * Загрузить всё с бэкенда разом
 * @returns {{ groups, courses, employees, companies }}
 */
export async function syncAll() {
    const [groups, courses, employees, companies] = await Promise.all([
        fetchGroups(),
        fetchCourses(),
        fetchEmployees(),
        fetchCompanies(),
    ])
    return {
        success: groups.success && courses.success,
        groups:    groups.success    ? groups.data    : null,
        courses:   courses.success   ? courses.data   : null,
        employees: employees.success ? employees.data : null,
        companies: companies.success ? companies.data : null,
    }
}