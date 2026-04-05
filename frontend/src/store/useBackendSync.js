/**
 * useBackendSync.js
 *
 * React-хук для загрузки данных с бэкенда в Zustand-стор.
 *
 * Стор уже имеет готовые сеттеры:
 *   setGroups(groups[])
 *   setCourses(courses[])
 *   setEmployees(employees[])
 *
 * Этот хук дёргает их после того, как сервисы распарсят JSON.
 *
 * Использование в App.jsx или Layout.jsx:
 *   const { loading, error, reload } = useBackendSync()
 *
 * Или только нужные сущности:
 *   const { loading } = useBackendSync({ groups: true, courses: true })
 */

import { useEffect, useState, useCallback } from 'react'
import { useStore } from './useStore.js'
import { companyService }       from '../services/companyService.js'
import { courseService }        from '../services/courseService.js'
import { employeeService }      from '../services/employeeService.js'
import { groupService }         from '../services/groupService.js'
import { specificationService } from '../services/specificationService.js'

const DEFAULT_OPTIONS = {
    companies:      true,
    courses:        true,   // загружает курсы с полной историей цен
    employees:      true,
    groups:         true,
    specifications: true,
}

export function useBackendSync(options = DEFAULT_OPTIONS) {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const {
        setGroups,
        setCourses,
        setEmployees,
    } = useStore()

    // Для компаний и спецификаций пишем напрямую в стор через сеттеры
    // (их нет в стандартных bulk-сеттерах, добавь если нужно)
    const store = useStore()

    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            // Загружаем параллельно всё что нужно
            const promises = []

            if (opts.companies) {
                promises.push(
                    companyService.getAll().then(companies => {
                        // Стор не имеет setCompanies — используем прямой set
                        // Добавь в useStore: setCompanies: (v) => set({ companies: v })
                        store.setCompanies?.(companies)
                    })
                )
            }

            if (opts.courses) {
                promises.push(
                    // getAllWithHistory — загружает с полной историей цен
                    // нужно для правильной работы getPriceOnDate в GroupModal
                    courseService.getAllWithHistory().then(setCourses)
                )
            }

            if (opts.employees) {
                promises.push(
                    employeeService.getAll().then(setEmployees)
                )
            }

            if (opts.groups) {
                promises.push(
                    groupService.getAll().then(setGroups)
                )
            }

            if (opts.specifications) {
                promises.push(
                    specificationService.getAll().then(specs => {
                        store.setSpecifications?.(specs)
                    })
                )
            }

            await Promise.all(promises)
        } catch (err) {
            console.error('Backend sync error:', err)
            setError(err.message || 'Ошибка загрузки данных')
        } finally {
            setLoading(false)
        }
    }, [])   // eslint-disable-line

    useEffect(() => {
        load()
    }, [load])

    return { loading, error, reload: load }
}
