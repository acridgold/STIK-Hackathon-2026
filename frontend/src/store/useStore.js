/**
 * GLOBAL STORE — Zustand
 * Хранит все сущности системы: компании, курсы, сотрудники, группы, спецификации.
 * Персистентность через localStorage.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, format } from 'date-fns'

// ─── helpers ───────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID()
const today = () => format(new Date(), 'yyyy-MM-dd')

// ─── VAT rate ──────────────────────────────────────────────────────────────
export const VAT_RATE = 0.22

// ─── SEED DATA ──────────────────────────────────────────────────────────────
function seedData() {
    const companies = [
        { id: 'c1', code: 'ГЛБ', name: 'Глобал Корп' },
        { id: 'c2', code: 'РМШ', name: 'Ромашка ООО' },
        { id: 'c3', code: 'АЛФ', name: 'Альфа-Технологии' },
    ]

    const courses = [
        {
            id: 'cr1',
            name: 'Основы работы в Global ERP',
            description: 'Базовый курс по работе с модулями ERP системы',
            durationDays: 5,
            priceHistory: [
                { price: 15000, validFrom: '2024-01-01' },
                { price: 18000, validFrom: '2025-06-01' },
            ],
        },
        {
            id: 'cr2',
            name: 'Финансовый учёт в ERP',
            description: 'Курс для специалистов бухгалтерии',
            durationDays: 3,
            priceHistory: [
                { price: 12000, validFrom: '2024-01-01' },
                { price: 14500, validFrom: '2025-09-01' },
            ],
        },
        {
            id: 'cr3',
            name: 'HR-модуль: управление персоналом',
            description: 'Работа с кадровым модулем, отчётность',
            durationDays: 2,
            priceHistory: [
                { price: 8000, validFrom: '2024-01-01' },
            ],
        },
    ]

    const employees = [
        { id: 'e1', fullName: 'Иванов Иван Иванович', companyId: 'c1', email: 'ivanov@globalcorp.ru' },
        { id: 'e2', fullName: 'Петрова Мария Сергеевна', companyId: 'c1', email: 'petrova@globalcorp.ru' },
        { id: 'e3', fullName: 'Сидоров Алексей Павлович', companyId: 'c2', email: 'sidorov@romashka.ru' },
        { id: 'e4', fullName: 'Козлова Наталья Юрьевна', companyId: 'c2', email: 'kozlova@romashka.ru' },
        { id: 'e5', fullName: 'Новиков Дмитрий Андреевич', companyId: 'c3', email: 'novikov@alpha.ru' },
    ]

    const groups = [
        {
            id: 'g1',
            courseId: 'cr1',
            startDate: '2025-02-10',
            endDate: '2025-02-14',
            status: 'done',
            specId: 'sp1',
            participants: [
                { participant_id: 'p1', groupId: 'g1', employee_id: 'e1', full_name: 'Иванов Иван Иванович', progress: 100 },
                { participant_id: 'p2', groupId: 'g1', employee_id: 'e2', full_name: 'Петрова Мария Сергеевна', progress: 100 },
                { participant_id: 'p3', groupId: 'g1', employee_id: 'e3', full_name: 'Сидоров Алексей Павлович', progress: 90 },
            ],
        },
    ]

    const specifications = [
        {
            id: 'sp1',
            date: '2025-01-15',
            number: 1,
            companyId: 'c1',
            groupIds: ['g1'],
        },
    ]

    return { companies, courses, employees, groups, specifications }
}

// ─── PRICE HELPERS ──────────────────────────────────────────────────────────
export function getPriceOnDate(course, targetDate) {
    if (!course) return 0
    const date = targetDate || today()
    const sorted = [...course.priceHistory].sort((a, b) =>
        a.validFrom < b.validFrom ? -1 : 1
    )
    let price = sorted[0]?.price ?? 0
    for (const entry of sorted) {
        if (entry.validFrom <= date) price = entry.price
    }
    return price
}

export function getCurrentPrice(course) {
    return getPriceOnDate(course, today())
}

// ─── DERIVED CALCULATORS ────────────────────────────────────────────────────
export function calcGroupCost(group, course) {
    if (!group || !course) return 0
    const pricePerPerson = getPriceOnDate(course, group.startDate)
    const count = group.participants.length
    return pricePerPerson * count
}

export function calcGroupProgress(group) {
    if (!group || group.participants.length === 0) return 0
    const sum = group.participants.reduce((acc, p) => acc + (p.progress || 0), 0)
    return Math.round(sum / group.participants.length)
}

// ─── STORE ──────────────────────────────────────────────────────────────────
const seed = seedData()

export const useStore = create(
    persist(
        (set, get) => ({
            // ── State ──
            companies: seed.companies,
            courses: seed.courses,
            employees: seed.employees,
            groups: seed.groups,
            specifications: seed.specifications,

            // ── Setters ──
            setGroups: (groups) => set(s => ({ groups: typeof groups === 'function' ? groups(s.groups) : groups })),
            setCourses: (courses) => set(s => ({ courses: typeof courses === 'function' ? courses(s.courses) : courses })),
            setEmployees: (employees) => set(s => ({ employees: typeof employees === 'function' ? employees(s.employees) : employees })),
            setCompanies: (companies) => set({ companies }),
            setSpecifications: (specifications) => set({ specifications }),

            // ── Actions ──
            addCompany: (data) => set(s => ({ companies: [...s.companies, { id: uid(), ...data }] })),

            addCourse: (data) => set(s => ({
                courses: [...s.courses, {
                    id: uid(),
                    name: data.name,
                    description: data.description || '',
                    durationDays: Number(data.durationDays),
                    priceHistory: [{ price: Number(data.price), validFrom: today() }]
                }]
            })),

            addParticipant: (groupId, employeeId) => set(s => {
                const employee = s.employees.find(e => e.id === employeeId);
                return {
                    groups: s.groups.map(g => {
                        if (g.id !== groupId) return g
                        if (g.participants.some(p => p.employee_id === employeeId)) return g
                        return {
                            ...g,
                            participants: [...g.participants, {
                                participant_id: uid(),
                                groupId,
                                employee_id: employeeId,
                                full_name: employee?.fullName || 'Неизвестный сотрудник',
                                progress: 0,
                            }]
                        }
                    })
                }
            }),

            // ── XML IMPORT (Исправленный под структуру JSON бэкенда) ──
            importFromXML: (xmlString) => {
                try {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(xmlString, 'application/xml')
                    const parseError = doc.querySelector('parsererror')
                    if (parseError) throw new Error('Ошибка парсинга XML')

                    const imported = { employees: 0, courses: 0, companies: 0, groups: 0 }

                    // 1. Импорт компаний
                    doc.querySelectorAll('Company').forEach(node => {
                        const id = node.getAttribute('id') || uid()
                        const code = node.querySelector('Code')?.textContent?.trim() || ''
                        const name = node.querySelector('Name')?.textContent?.trim() || ''
                        if (!name) return
                        set(s => {
                            if (s.companies.some(c => c.id === id)) return s
                            imported.companies++
                            return { companies: [...s.companies, { id, code, name }] }
                        })
                    })

                    // 2. Импорт курсов (Edu_Course)
                    doc.querySelectorAll('Edu_Course').forEach(node => {
                        const id = node.querySelector('id')?.textContent?.trim() || uid()
                        const name = node.querySelector('sCourseHL')?.textContent?.trim() || ''
                        const description = node.querySelector('sDescription')?.textContent?.trim() || ''
                        const durationDays = Number(node.querySelector('nDurationInDays')?.textContent) || 1
                        const price = Number(node.querySelector('nPricePerPerson')?.textContent) || 0
                        if (!name) return
                        set(s => {
                            if (s.courses.some(c => c.id === id)) return s
                            imported.courses++
                            return {
                                courses: [...s.courses, {
                                    id, name, description, durationDays,
                                    priceHistory: [{ price, validFrom: today() }]
                                }]
                            }
                        })
                    })

                    // 3. Импорт сотрудников (Edu_Participant)
                    doc.querySelectorAll('Edu_Participant').forEach(node => {
                        const id = node.querySelector('id')?.textContent?.trim() || uid()
                        const fullName = node.querySelector('sFIO')?.textContent?.trim() || ''
                        const companyId = node.querySelector('idOrganization')?.textContent?.trim() || ''
                        if (!fullName) return
                        set(s => {
                            if (s.employees.some(e => e.id === id)) return s
                            imported.employees++
                            return {
                                employees: [...s.employees, { id, fullName, companyId, email: '' }]
                            }
                        })
                    })

                    // 4. Импорт групп (TrainingGroup) — СИНХРОНИЗИРОВАНО С JSON
                    doc.querySelectorAll('TrainingGroup').forEach(node => {
                        const id = node.getAttribute('id') || uid()
                        const courseId = node.querySelector('CourseID')?.textContent?.trim() || ''
                        const startDate = node.querySelector('StartDate')?.textContent?.trim() || ''
                        const endDate = node.querySelector('EndDate')?.textContent?.trim() || ''
                        const status = node.querySelector('Status')?.textContent?.trim() || 'planned'

                        if (!courseId || !startDate || !endDate) return

                        const participants = []
                        node.querySelectorAll('Participant').forEach(pNode => {
                            const employeeId = pNode.querySelector('EmployeeID')?.textContent?.trim() || ''
                            const progress = Number(pNode.querySelector('Progress')?.textContent) || 0

                            // Пытаемся найти имя сотрудника в сторе для full_name
                            const employee = get().employees.find(e => e.id === employeeId);

                            if (employeeId) {
                                participants.push({
                                    participant_id: uid(), // Совпадает с ключом из JSON
                                    groupId: id,
                                    employee_id: employeeId, // Совпадает с ключом из JSON
                                    full_name: employee?.fullName || 'Сотрудник загружен из XML', // Важно для UI
                                    progress: Math.min(100, Math.max(0, progress))
                                })
                            }
                        })

                        set(s => {
                            if (s.groups.some(g => g.id === id)) return s
                            imported.groups++
                            return {
                                groups: [...s.groups, {
                                    id, courseId, startDate, endDate, status,
                                    specId: null,
                                    participants
                                }]
                            }
                        })
                    })

                    return { success: true, imported }
                } catch (err) {
                    console.error('XML Import error:', err)
                    return { success: false, error: err.message }
                }
            },
        }),
        {
            name: 'erp-learning-store',
            version: 2, // Поднял версию, так как структура участников изменилась
        }
    )
)