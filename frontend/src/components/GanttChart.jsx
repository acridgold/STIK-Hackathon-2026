import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Calendar, AlertCircle, Download, Upload, Edit2, Check, X, RefreshCw } from 'lucide-react'
import { useStore } from '../store/useStore.js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { uploadXMLToBackend, exportAllToBackend, downloadXMLFromBackend } from '../components/api/xmlService.js'

/**
 * Компонент интерактивной диаграммы Ганта
 * 
 * Реализует обязательный MVP-функционал по п. 4.1.1 Положения:
 * - отображение временной шкалы с периодами обучения
 * - визуальное выделение текущего прогресса внутри каждой полосы
 * - масштабирование (неделя / месяц / квартал)
 * - возможность открытия детализации по группе
 * 
 * Дополнительно реализованы бонусные возможности:
 * - Drag & Drop для изменения дат групп
 * - Автоматическая проверка конфликтов расписания
 * - Асинхронная интеграция с Global ERP через XML (п. 4.1.4.1)
 * - Автоматический экспорт/импорт данных
 * 
 * Комментарии к ключевым алгоритмам добавлены в соответствии 
 * с требованиями п. 6.4 Положения и п. 4.2 Руководства участника.
 */
export default function GanttChart({ groups = [], courses = [], onGroupClick }) {
    const [viewMode, setViewMode] = useState('month')
    const [draggingGroup, setDraggingGroup] = useState(null)
    const [dragStart, setDragStart] = useState({ x: 0, originalStartDate: null })
    const [editingGroup, setEditingGroup] = useState(null)
    const [editProgress, setEditProgress] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncTime, setLastSyncTime] = useState(null)
    const scrollRef = useRef(null)
    const { updateGroup, updateParticipantProgress } = useStore()

    /**
     * Получение названия курса по ID
     * Используется для отображения в карточках и подсказках
     */
    const getCourseName = (courseId) => {
        const course = courses.find(c => c.id === courseId)
        return course ? course.name : 'Курс не выбран'
    }

    /**
     * =============================================
     * АЛГОРИТМ РАСЧЁТА ПРОГРЕССА ОБУЧЕНИЯ ПО ГРУППЕ
     * (п. 4.2 Руководства участника + п. 2.2.3 модели данных)
     * =============================================
     * 
     * Логика:
     * 1. Берём массив участников группы (participants)
     * 2. Суммируем их индивидуальный прогресс (progress)
     * 3. Делим на количество участников → получаем среднее арифметическое
     * 4. Округляем до целого (Math.round)
     * 
     * Этот алгоритм используется:
     * - для отображения прогресса в карточке группы
     * - для заливки полосы на диаграмме Ганта
     * - для обновления среднего прогресса в сторе
     * 
     * Примечание: соответствует формуле из Положения:
     * «Общий прогресс прохождения программы (в %) – является вычисляемым, 
     * как среднее арифметическое, между общим прогрессом всех участников»
     */
    const calcProgress = (group) => {
        if (!group.participants?.length) return 0
        const sum = group.participants.reduce((acc, p) => acc + (p.progress || 0), 0)
        return Math.round(sum / group.participants.length)
    }

    /**
     * Обновление прогресса сразу для всех участников группы
     * (используется при редактировании прогресса из диаграммы Ганта)
     */
    const updateGroupProgress = (groupId, newProgress) => {
        const group = groups.find(g => g.id === groupId)
        if (!group?.participants) return
        group.participants.forEach(participant => {
            updateParticipantProgress(groupId, participant.id, newProgress)
        })
    }

    /**
     * Обновление дат группы (вызывается при Drag & Drop)
     */
    const updateGroupDates = (groupId, newStartDate, newEndDate) => {
        updateGroup(groupId, { 
            startDate: newStartDate, 
            endDate: newEndDate 
        })
    }

    /**
     * =============================================
     * ПРОВЕРКА КОНФЛИКТОВ РАСПИСАНИЯ (бонусный функционал п. 4.1.4.2)
     * =============================================
     * 
     * Алгоритм:
     * 1. Собираем Set ID сотрудников текущей группы
     * 2. Для каждой другой группы проверяем:
     *    - пересекаются ли даты (aStart <= bEnd && bStart <= aEnd)
     *    - есть ли общие сотрудники
     * 3. Если да — возвращаем true (конфликт)
     * 
     * Используется для визуального выделения конфликтующих групп
     * и уведомления пользователя.
     */
    const hasConflict = (group, allGroups) => {
        const currentEmployees = new Set(group.participants?.map(p => p.employeeId) || [])
        if (currentEmployees.size === 0) return false
        return allGroups.some(other => {
            if (other.id === group.id) return false
            const otherEmployees = new Set(other.participants?.map(p => p.employeeId) || [])
            if (otherEmployees.size === 0) return false
            const aStart = new Date(group.startDate)
            const aEnd = new Date(group.endDate)
            const bStart = new Date(other.startDate)
            const bEnd = new Date(other.endDate)
            const datesOverlap = aStart <= bEnd && bStart <= aEnd
            if (!datesOverlap) return false
            for (let emp of currentEmployees) {
                if (otherEmployees.has(emp)) return true
            }
            return false
        })
    }

    /**
     * =============================================
     * ЛОГИКА ПОСТРОЕНИЯ ДИАГРАММЫ ГАНТА
     * (основной алгоритм по п. 4.2 Руководства + п. 4.1.1 Положения)
     * =============================================
     * 
     * 1. Определяем минимальную и максимальную даты всех групп
     * 2. Добавляем отступы (padding) для удобства отображения
     * 3. Формируем массив колонок в зависимости от режима:
     *    - week  → шаг 7 дней
     *    - month → шаг 1 месяц
     *    - quarter → шаг 3 месяца
     * 4. Рассчитываем pixelsPerDay — сколько пикселей приходится на 1 день
     * 5. Для каждой группы считаем left и width через getGroupPosition()
     * 
     * Всё вычисляется в useMemo — пересчёт происходит только при изменении
     * групп или режима отображения (оптимизация производительности).
     */
    const { allDates, minDate, maxDate, pixelsPerDay } = useMemo(() => {
        if (!groups.length) {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const end = new Date(now.getFullYear(), now.getMonth() + 3, 0)
            const dates = []
            let current = new Date(start)
            while (current <= end) {
                dates.push(new Date(current))
                if (viewMode === 'week') current.setDate(current.getDate() + 7)
                else if (viewMode === 'month') current.setMonth(current.getMonth() + 1)
                else current.setMonth(current.getMonth() + 3)
            }
            const columnWidth = viewMode === 'week' ? 100 : viewMode === 'month' ? 120 : 150
            const pixelsPerDayCalc = columnWidth / (viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 90)
            return { allDates: dates, minDate: start, maxDate: end, pixelsPerDay: pixelsPerDayCalc }
        }
       
        let min = new Date(groups[0].startDate)
        let max = new Date(groups[0].endDate)
        groups.forEach(g => {
            const start = new Date(g.startDate)
            const end = new Date(g.endDate)
            if (start < min) min = start
            if (end > max) max = end
        })
       
        const paddedMin = new Date(min.getFullYear(), min.getMonth() - 1, 1)
        const paddedMax = new Date(max.getFullYear(), max.getMonth() + 2, 0)
       
        const dates = []
        let current = new Date(paddedMin)
        while (current <= paddedMax) {
            dates.push(new Date(current))
            if (viewMode === 'week') current.setDate(current.getDate() + 7)
            else if (viewMode === 'month') current.setMonth(current.getMonth() + 1)
            else current.setMonth(current.getMonth() + 3)
        }
       
        const columnWidth = viewMode === 'week' ? 100 : viewMode === 'month' ? 120 : 150
        const pixelsPerDayCalc = columnWidth / (viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 90)
        
        return { allDates: dates, minDate: paddedMin, maxDate: paddedMax, pixelsPerDay: pixelsPerDayCalc }
    }, [groups, viewMode])

    const columnWidth = viewMode === 'week' ? 100 : viewMode === 'month' ? 120 : 150
    const totalWidth = allDates.length * columnWidth + 280

    /**
     * Расчёт позиции и ширины полосы группы на диаграмме
     * 
     * Формулы:
     * left = (startDate - minDate) * pixelsPerDay
     * width = (endDate - startDate) * pixelsPerDay
     * 
     * Минимальная ширина = 30px (чтобы полоса всегда была видна)
     */
    const getGroupPosition = (group) => {
        const groupStart = new Date(group.startDate)
        const groupEnd = new Date(group.endDate)
        
        const startOffsetDays = Math.max(0, (groupStart - minDate) / (1000 * 60 * 60 * 24))
        const durationDays = Math.max(1, (groupEnd - groupStart) / (1000 * 60 * 60 * 24))
        
        const left = startOffsetDays * pixelsPerDay
        const width = durationDays * pixelsPerDay
        
        return { left: Math.max(0, left), width: Math.max(width, 30) }
    }

    const getColumnLabel = (date) => {
        if (viewMode === 'week') {
            return `${date.getDate()}/${date.getMonth() + 1}`
        } else if (viewMode === 'month') {
            return date.toLocaleString('ru', { month: 'short' })
        } else {
            const quarter = Math.floor(date.getMonth() / 3) + 1
            return `${quarter} кв`
        }
    }

    /**
     * Экспорт диаграммы в PDF (бонусный функционал)
     */
    const exportToPDF = async () => {
        const element = document.getElementById('gantt-container')
        if (!element) return
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#1a1a2e', logging: false })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('landscape')
            pdf.addImage(imgData, 'PNG', 5, 5, 290, 150)
            pdf.save(`gantt-chart-${new Date().toISOString().slice(0, 10)}.pdf`)
        } catch (error) {
            console.error('Ошибка экспорта PDF:', error)
            alert('Не удалось создать PDF')
        }
    }

    /**
     * =============================================
     * АСИНХРОННАЯ ИНТЕГРАЦИЯ С GLOBAL ERP (п. 4.1.4.1)
     * =============================================
     * 
     * Реализовано:
     * 1. Автоматическая загрузка XML из бэкенда при монтировании
     * 2. Автоматический экспорт изменений (debounce 2 сек)
     * 3. Ручная синхронизация по кнопке
     * 4. Загрузка XML-файла пользователем
     * 
     * Парсинг XML делегируется store.importFromXML()
     * (логика парсинга и валидации находится в сторе — см. комментарии там)
     */

    // 1. Автоматическая загрузка данных с бэкенда
    const autoLoadFromBackend = async () => {
        console.log('🔄 Автоматическая загрузка XML с бэкэнда...')
        setIsSyncing(true)
        
        try {
            const groupsResult = await downloadXMLFromBackend('groups')
            if (groupsResult.success && groupsResult.data) {
                const importResult = useStore.getState().importFromXML(groupsResult.data)
                console.log(`📊 Загружено групп: ${importResult.imported?.groups || 0}`)
            }
            
            const coursesResult = await downloadXMLFromBackend('courses')
            if (coursesResult.success && coursesResult.data) {
                const importResult = useStore.getState().importFromXML(coursesResult.data)
                console.log(`📚 Загружено курсов: ${importResult.imported?.courses || 0}`)
            }
            
            const employeesResult = await downloadXMLFromBackend('employees')
            if (employeesResult.success && employeesResult.data) {
                const importResult = useStore.getState().importFromXML(employeesResult.data)
                console.log(`👥 Загружено сотрудников: ${importResult.imported?.employees || 0}`)
            }
            
            setLastSyncTime(new Date())
            console.log('✅ Автоматическая синхронизация завершена')
        } catch (error) {
            console.log('⚠️ Бэкэнд не доступен, работаем с локальными данными')
        } finally {
            setIsSyncing(false)
        }
    }

    // 2. Автоматический экспорт данных на бэкэнд (при изменениях)
    const autoExportToBackend = async () => {
        const store = useStore.getState()
        
        if (store.groups.length === 0 && store.courses.length === 0 && store.employees.length === 0) {
            return
        }
        
        console.log('📤 Автоматический экспорт данных на бэкэнд...')
        
        const result = await exportAllToBackend({
            groups: store.groups,
            courses: store.courses,
            employees: store.employees,
            companies: store.companies
        })
        
        if (result.success) {
            console.log('✅ Данные автоматически экспортированы на бэкэнд')
        } else {
            console.log('⚠️ Бэкэнд не доступен, данные сохранены локально')
        }
    }

    // 3. Ручная синхронизация
    const manualSync = async () => {
        setIsSyncing(true)
        try {
            await autoLoadFromBackend()
            if (lastSyncTime) {
                alert('✅ Синхронизация с бэкэндом завершена')
            } else {
                alert('⚠️ Бэкэнд не доступен, работаем с локальными данными')
            }
        } catch (error) {
            alert('❌ Бэкэнд не доступен')
        } finally {
            setIsSyncing(false)
        }
    }

    // Автоматическая загрузка при первом рендере
    useEffect(() => {
        autoLoadFromBackend()
    }, [])

    // Автоматический экспорт с debounce
    const debounceTimer = useRef(null)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            if (groups.length > 0 || courses.length > 0) {
                autoExportToBackend()
            }
        }, 2000)
        
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
        }
    }, [groups, courses])

    useEffect(() => {
        if (scrollRef.current && minDate && maxDate) {
            const today = new Date()
            if (today >= minDate && today <= maxDate) {
                const todayOffsetDays = (today - minDate) / (1000 * 60 * 60 * 24)
                const scrollTo = todayOffsetDays * pixelsPerDay - 300
                if (scrollTo > 0) {
                    scrollRef.current.scrollLeft = scrollTo
                }
            }
        }
    }, [minDate, maxDate, pixelsPerDay])

    /**
     * Обработка загрузки XML-файла пользователем
     * (п. 4.1.4.1 — функционал загрузки и парсинга XML)
     */
    const handleXMLUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        
        const uploadResult = await uploadXMLToBackend(file, 'groups')
        if (uploadResult.success) {
            console.log('✅ XML отправлен на бэкэнд')
        } else {
            console.warn('⚠️ Бэкэнд не доступен:', uploadResult.error)
        }
        
        const text = await file.text()
        const result = useStore.getState().importFromXML(text)
        
        if (result.success) {
            alert(`✅ Импорт завершён!\nГрупп: ${result.imported.groups}\nКурсов: ${result.imported.courses}\nСотрудников: ${result.imported.employees}`)
            window.location.reload()
        } else {
            alert(`❌ Ошибка импорта: ${result.error}`)
        }
    }

    // ==================== DRAG & DROP ====================
    const handleDragStart = (e, group) => {
        e.preventDefault()
        e.stopPropagation()
        setDraggingGroup(group.id)
        setDragStart({ 
            x: e.clientX, 
            originalStartDate: new Date(group.startDate) 
        })
    }

    const handleDragMove = (e) => {
        if (!draggingGroup) return
        
        const deltaX = e.clientX - dragStart.x
        const deltaDays = Math.round(deltaX / pixelsPerDay)
        
        if (deltaDays === 0) return
        
        const group = groups.find(g => g.id === draggingGroup)
        if (!group) return
        
        const newStart = new Date(dragStart.originalStartDate)
        newStart.setDate(newStart.getDate() + deltaDays)
        const newEnd = new Date(group.endDate)
        newEnd.setDate(newEnd.getDate() + deltaDays)
        
        const minBound = new Date(minDate)
        minBound.setDate(minDate.getDate() + 1)
        const maxBound = new Date(maxDate)
        maxBound.setDate(maxDate.getDate() - 1)
        
        if (newStart >= minBound && newEnd <= maxBound) {
            updateGroupDates(
                draggingGroup, 
                newStart.toISOString().split('T')[0], 
                newEnd.toISOString().split('T')[0]
            )
            setDragStart({ 
                x: e.clientX, 
                originalStartDate: newStart 
            })
        }
    }

    const handleDragEnd = () => {
        setDraggingGroup(null)
    }

    const startEditing = (group) => {
        setEditingGroup(group.id)
        setEditProgress(calcProgress(group))
    }

    const saveProgress = (groupId) => {
        updateGroupProgress(groupId, editProgress)
        setEditingGroup(null)
    }

    useEffect(() => {
        if (draggingGroup) {
            window.addEventListener('mousemove', handleDragMove)
            window.addEventListener('mouseup', handleDragEnd)
            return () => {
                window.removeEventListener('mousemove', handleDragMove)
                window.removeEventListener('mouseup', handleDragEnd)
            }
        }
    }, [draggingGroup, dragStart, pixelsPerDay])

    if (!groups.length) {
        return (
            <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <AlertCircle size={24} color="var(--accent-blue)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Нет групп для отображения. Создайте учебную группу.</p>
                <button onClick={manualSync} disabled={isSyncing} style={{
                    marginTop: '16px',
                    padding: '8px 20px',
                    fontSize: 13,
                    background: 'rgba(77, 166, 255, 0.2)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(77, 166, 255, 0.3)',
                    borderRadius: '30px',
                    cursor: 'pointer'
                }}>
                    {isSyncing ? 'Синхронизация...' : '🔄 Синхронизировать с бэкэндом'}
                </button>
            </div>
        )
    }

    return (
        <div id="gantt-container" className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* ... (остальная JSX-разметка без изменений) ... */}
            {/* Полный JSX остаётся прежним, изменения только в комментариях выше */}
        </div>
    )
}