const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

async function request(method, path, body) {
    // Если путь не начинается с /api, добавляем его сами для консистентности
    const fullPath = path.startsWith('/api') ? path : `/api${path}`;

    const res = await fetch(`${BASE_URL}${fullPath}`, {
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
    addParticipant: (groupId, employee_id) =>
        request('POST', `/groups/${groupId}/participants`, { employee_id }),
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
    importXML: (file, type) => {
        const form = new FormData();
        form.append('file', file);
        form.append('type', type);

        return fetch(`${BASE_URL}/api/xml/upload`, {
            method: 'POST',
            body: form
        }).then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error || `Error ${res.status}`) });
            return res.json();
        });
    }
}

export default api;