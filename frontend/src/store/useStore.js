/**
 * GLOBAL STORE — Zustand
 * Хранит все сущности системы: компании, курсы, сотрудники, группы, спецификации.
 * Персистентность через localStorage.
 *
 * Модель данных:
 *   Company       → id, code, name
 *   Course        → id, name, description, durationDays, priceHistory[]
 *   Employee      → id, fullName, companyId, email, groupIds[]
 *   Group         → id, courseId, startDate, endDate, status, specId, participants[]
 *   Participant   → id, groupId, employeeId, progress (0-100)
 *   Specification → id, date, number, companyId, groupIds[]
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
                { id: 'p1', groupId: 'g1', employeeId: 'e1', progress: 100 },
                { id: 'p2', groupId: 'g1', employeeId: 'e2', progress: 100 },
                { id: 'p3', groupId: 'g1', employeeId: 'e3', progress: 90 },
            ],
        },
        {
            id: 'g2',
            courseId: 'cr2',
            startDate: '2025-03-03',
            endDate: '2025-03-05',
            status: 'done',
            specId: 'sp1',
            participants: [
                { id: 'p4', groupId: 'g2', employeeId: 'e4', progress: 100 },
                { id: 'p5', groupId: 'g2', employeeId: 'e5', progress: 85 },
            ],
        },
        {
            id: 'g3',
            courseId: 'cr3',
            startDate: '2025-05-12',
            endDate: '2025-05-13',
            status: 'active',
            specId: null,
            participants: [
                { id: 'p6', groupId: 'g3', employeeId: 'e1', progress: 60 },
                { id: 'p7', groupId: 'g3', employeeId: 'e3', progress: 40 },
            ],
        },
        {
            id: 'g4',
            courseId: 'cr1',
            startDate: '2025-07-07',
            endDate: '2025-07-11',
            status: 'planned',
            specId: null,
            participants: [],
        },
    ]

    const specifications = [
        {
            id: 'sp1',
            date: '2025-01-15',
            number: 1,
            companyId: 'c1',
            groupIds: ['g1', 'g2'],
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

export function calcSpecTotals(spec, groups, courses) {
    const specGroups = groups.filter(g => spec.groupIds.includes(g.id))
    const subtotal = specGroups.reduce((acc, g) => {
        const course = courses.find(c => c.id === g.courseId)
        return acc + calcGroupCost(g, course)
    }, 0)
    const vat = subtotal * VAT_RATE
    const total = subtotal + vat
    return { subtotal, vat, total }
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

            // ── Companies ──
            addCompany: (data) => set(s => ({
                companies: [...s.companies, { id: uid(), ...data }]
            })),
            updateCompany: (id, data) => set(s => ({
                companies: s.companies.map(c => c.id === id ? { ...c, ...data } : c)
            })),
            deleteCompany: (id) => set(s => ({
                companies: s.companies.filter(c => c.id !== id)
            })),

            // ── Courses ──
            addCourse: (data) => set(s => ({
                courses: [...s.courses, {
                    id: uid(),
                    name: data.name,
                    description: data.description || '',
                    durationDays: Number(data.durationDays),
                    priceHistory: [{ price: Number(data.price), validFrom: today() }]
                }]
            })),
            updateCourse: (id, data) => set(s => ({
                courses: s.courses.map(c => {
                    if (c.id !== id) return c
                    if (data.price !== undefined) {
                        const current = getCurrentPrice(c)
                        const newPrice = Number(data.price)
                        if (newPrice !== current) {
                            return {
                                ...c,
                                ...data,
                                priceHistory: [...c.priceHistory, { price: newPrice, validFrom: today() }]
                            }
                        }
                    }
                    return { ...c, ...data }
                })
            })),
            deleteCourse: (id) => set(s => ({
                courses: s.courses.filter(c => c.id !== id)
            })),

            // ── Employees ──
            addEmployee: (data) => set(s => ({
                employees: [...s.employees, { id: uid(), ...data }]
            })),
            updateEmployee: (id, data) => set(s => ({
                employees: s.employees.map(e => e.id === id ? { ...e, ...data } : e)
            })),
            deleteEmployee: (id) => set(s => ({
                employees: s.employees.filter(e => e.id !== id),
                groups: s.groups.map(g => ({
                    ...g,
                    participants: g.participants.filter(p => p.employeeId !== id)
                }))
            })),

            // ── Groups ──
            addGroup: (data) => set(s => ({
                groups: [...s.groups, {
                    id: uid(),
                    courseId: data.courseId,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    status: data.status || 'planned',
                    specId: null,
                    participants: [],
                }]
            })),
            updateGroup: (id, data) => set(s => ({
                groups: s.groups.map(g => g.id === id ? { ...g, ...data } : g)
            })),
            deleteGroup: (id) => set(s => ({
                groups: s.groups.filter(g => g.id !== id),
                specifications: s.specifications.map(sp => ({
                    ...sp,
                    groupIds: sp.groupIds.filter(gid => gid !== id)
                }))
            })),

            // ── Bulk setters (для загрузки с бэкенда) ──
            setGroups:    (groups)    => set(s => ({ groups:    typeof groups    === 'function' ? groups(s.groups)    : groups })),
            setCourses:   (courses)   => set(s => ({ courses:   typeof courses   === 'function' ? courses(s.courses)   : courses })),
            setEmployees: (employees) => set(s => ({ employees: typeof employees === 'function' ? employees(s.employees) : employees })),

            // ── Participants ──
            addParticipant: (groupId, employeeId) => set(s => ({
                groups: s.groups.map(g => {
                    if (g.id !== groupId) return g
                    if (g.participants.some(p => p.employeeId === employeeId)) return g
                    return {
                        ...g,
                        participants: [...g.participants, {
                            id: uid(),
                            groupId,
                            employeeId,
                            progress: 0,
                        }]
                    }
                })
            })),
            removeParticipant: (groupId, participantId) => set(s => ({
                groups: s.groups.map(g => {
                    if (g.id !== groupId) return g
                    return { ...g, participants: g.participants.filter(p => p.id !== participantId) }
                })
            })),
            updateParticipantProgress: (groupId, participantId, progress) => set(s => ({
                groups: s.groups.map(g => {
                    if (g.id !== groupId) return g
                    return {
                        ...g,
                        participants: g.participants.map(p =>
                            p.id === participantId
                                ? { ...p, progress: Math.min(100, Math.max(0, Number(progress))) }
                                : p
                        )
                    }
                })
            })),

            // ── Specifications ──
            addSpecification: (data) => set(s => {
                const specId = uid()
                const groupIds = data.groupIds || []
                return {
                    specifications: [...s.specifications, {
                        id: specId,
                        date: data.date || today(),
                        number: data.number,
                        companyId: data.companyId,
                        groupIds,
                    }],
                    groups: s.groups.map(g =>
                        groupIds.includes(g.id) ? { ...g, specId } : g
                    )
                }
            }),
            updateSpecification: (id, data) => set(s => {
                const oldSpec = s.specifications.find(sp => sp.id === id)
                const newGroupIds = data.groupIds || oldSpec?.groupIds || []
                const oldGroupIds = oldSpec?.groupIds || []
                return {
                    specifications: s.specifications.map(sp =>
                        sp.id === id ? { ...sp, ...data, groupIds: newGroupIds } : sp
                    ),
                    groups: s.groups.map(g => {
                        if (newGroupIds.includes(g.id)) return { ...g, specId: id }
                        if (oldGroupIds.includes(g.id) && !newGroupIds.includes(g.id)) return { ...g, specId: null }
                        return g
                    })
                }
            }),
            deleteSpecification: (id) => set(s => ({
                specifications: s.specifications.filter(sp => sp.id !== id),
                groups: s.groups.map(g => g.specId === id ? { ...g, specId: null } : g)
            })),

            // ── XML IMPORT ──
            importFromXML: (xmlString) => {
                try {
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(xmlString, 'application/xml')
                    const parseError = doc.querySelector('parsererror')
                    if (parseError) throw new Error('Ошибка парсинга XML')

                    const imported = { employees: 0, courses: 0, companies: 0, groups: 0 }

                    // Импорт компаний
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

                    // Импорт курсов (формат Edu_Course)
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

                    // Импорт сотрудников (формат Edu_Participant)
                    doc.querySelectorAll('Edu_Participant').forEach(node => {
                        const id = node.querySelector('id')?.textContent?.trim() || uid()
                        const fullName = node.querySelector('sFIO')?.textContent?.trim() || ''
                        const companyName = node.querySelector('idOrganizationHL')?.textContent?.trim() || ''
                        const companyId = node.querySelector('idOrganization')?.textContent?.trim() || ''
                        
                        if (!fullName) return
                        
                        set(s => {
                            if (s.employees.some(e => e.id === id)) return s
                            
                            // Если компании нет — создаём
                            if (companyId && !s.companies.some(c => c.id === companyId)) {
                                imported.companies++
                                s.companies = [...s.companies, {
                                    id: companyId,
                                    code: companyId.slice(-4),
                                    name: companyName || `Компания ${companyId}`
                                }]
                            }
                            
                            imported.employees++
                            return {
                                employees: [...s.employees, {
                                    id,
                                    fullName,
                                    companyId: companyId || null,
                                    email: ''
                                }]
                            }
                        })
                    })

                    // Импорт учебных групп для диаграммы Ганта
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
                            if (employeeId) {
                                participants.push({
                                    id: uid(),
                                    groupId: id,
                                    employeeId,
                                    progress: Math.min(100, Math.max(0, progress))
                                })
                            }
                        })
                        
                        set(s => {
                            if (s.groups.some(g => g.id === id)) return s
                            imported.groups++
                            return {
                                groups: [...s.groups, {
                                    id,
                                    courseId,
                                    startDate,
                                    endDate,
                                    status,
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
            version: 1,
        }
    )
)