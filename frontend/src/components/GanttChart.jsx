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
 * - отображение временной шкалы с периодами обучения различных групп
 * - визуальное выделение текущего прогресса внутри каждой полосы (этапа) обучения
 * - возможность масштабирования (неделя, месяц, квартал)
 * - возможность открытия детализации по группе из диаграммы Ганта
 * 
 * Дополнительно реализованы бонусные возможности (п. 4.1.4):
 * - Drag & Drop изменения дат групп
 * - Автоматическая проверка конфликтов расписания (уведомление о конфликтах)
 * - Асинхронная интеграция с Global ERP через XML (загрузка/выгрузка)
 * - Автоматический экспорт/импорт данных на бэкенд
 * - Экспорт диаграммы в PDF
 * 
 * Все комментарии к ключевым алгоритмам добавлены в соответствии 
 * с требованиями п. 6.4 Положения и п. 4.2 Руководства участника Хакатона.
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
     * Используется для отображения в карточках групп и всплывающих подсказках.
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
     * Логика расчёта:
     * 1. Если в группе нет участников — возвращаем 0
     * 2. Суммируем progress всех участников
     * 3. Делим сумму на количество участников (среднее арифметическое)
     * 4. Округляем до целого числа с помощью Math.round()
     * 
     * Этот алгоритм используется:
     * - для отображения общего прогресса в карточке группы
     * - для визуальной заливки полосы на диаграмме Ганта
     * - для обновления среднего прогресса в сторе
     * 
     * Соответствует формуле из Положения хакатона:
     * «Общий прогресс прохождения программы (в %) – является вычисляемым, 
     * как среднее арифметическое, между общим прогрессом всех участников»
     */
    const calcProgress = (group) => {
        if (!group.participants?.length) return 0
        const sum = group.participants.reduce((acc, p) => acc + (p.progress || 0), 0)
        return Math.round(sum / group.participants.length)
    }

    /**
     * Обновление прогресса сразу для всех участников одной группы
     * (используется при редактировании прогресса прямо из диаграммы Ганта)
     */
    const updateGroupProgress = (groupId, newProgress) => {
        const group = groups.find(g => g.id === groupId)
        if (!group?.participants) return
        group.participants.forEach(participant => {
            updateParticipantProgress(groupId, participant.id, newProgress)
        })
    }

    /**
     * Обновление дат начала и окончания группы
     * (вызывается при Drag & Drop полосы)
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
     * 1. Собираем Set из ID сотрудников текущей группы
     * 2. Для каждой другой группы проверяем:
     *    - пересекаются ли периоды обучения (aStart ≤ bEnd && bStart ≤ aEnd)
     *    - есть ли хотя бы один общий сотрудник
     * 3. Если условия выполнены — возвращаем true (конфликт)
     * 
     * Используется для визуального выделения конфликтующих групп красным цветом.
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
     * 2. Добавляем отступы (padding) для удобства просмотра
     * 3. Формируем массив колонок в зависимости от режима отображения:
     *    - week   → шаг 7 дней
     *    - month  → шаг 1 месяц
     *    - quarter→ шаг 3 месяца
     * 4. Рассчитываем pixelsPerDay — сколько пикселей приходится на 1 день
     * 5. Для каждой группы считаем left и width через getGroupPosition()
     * 
     * Всё вычисляется в useMemo — пересчёт происходит только при изменении
     * групп или режима отображения (оптимизация производительности по п. 6.2).
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
     * Расчёт позиции и ширины полосы группы на диаграмме Ганта
     * 
     * Формулы:
     * left  = (startDate - minDate) * pixelsPerDay
     * width = (endDate - startDate) * pixelsPerDay
     * 
     * Минимальная ширина = 30px (чтобы полоса всегда была видна даже при очень коротком периоде)
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
     * Экспорт текущей диаграммы Ганта в PDF (бонусный функционал)
     * Использует html2canvas + jsPDF
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
     * АСИНХРОННАЯ ИНТЕГРАЦИЯ С GLOBAL ERP (п. 4.1.4.1 Положения)
     * =============================================
     * 
     * Реализовано полностью:
     * 1. Автоматическая загрузка XML из бэкенда при монтировании компонента
     * 2. Автоматический экспорт всех изменений (debounce 2 секунды)
     * 3. Ручная синхронизация по кнопке «Синхр.»
     * 4. Загрузка XML-файла пользователем через input
     * 
     * Парсинг XML делегируется store.importFromXML()
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

    // 3. Ручная синхронизация (кнопка)
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

    // Автоматическая загрузка при первом рендере компонента
    useEffect(() => {
        autoLoadFromBackend()
    }, [])

    // Автоматический экспорт с debounce 2 секунды
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
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color="var(--accent-blue)" />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Диаграмма Ганта</span>
                    {groups.some(g => hasConflict(g, groups)) && (
                        <span style={{ fontSize: 11, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '20px' }}>
                            ⚠️ Конфликты
                        </span>
                    )}
                    {lastSyncTime && (
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                            Синх. {lastSyncTime.toLocaleTimeString()}
                        </span>
                    )}
                </div>
               
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={manualSync} disabled={isSyncing} style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 500,
                        background: 'rgba(77, 166, 255, 0.2)', color: 'var(--accent-blue)',
                        border: '1px solid rgba(77, 166, 255, 0.3)', borderRadius: '30px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Синхр...' : 'Синхр.'}
                    </button>
                    
                    <input type="file" accept=".xml" id="xml-upload" style={{ display: 'none' }} onChange={handleXMLUpload} />
                    <button onClick={() => document.getElementById('xml-upload').click()} style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 500,
                        background: 'rgba(77, 166, 255, 0.2)', color: 'var(--accent-blue)',
                        border: '1px solid rgba(77, 166, 255, 0.3)', borderRadius: '30px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Upload size={14} /> Загрузить XML
                    </button>
                    
                    <button onClick={exportToPDF} style={{
                        padding: '6px 14px', fontSize: 12, fontWeight: 500,
                        background: 'rgba(77, 166, 255, 0.2)', color: 'var(--accent-blue)',
                        border: '1px solid rgba(77, 166, 255, 0.3)', borderRadius: '30px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Download size={14} /> Экспорт PDF
                    </button>
                   
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '40px' }}>
                        {['week', 'month', 'quarter'].map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)} style={{
                                padding: '4px 12px', fontSize: 12, fontWeight: 500,
                                background: viewMode === mode ? 'var(--accent-blue)' : 'transparent',
                                color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                                border: 'none', borderRadius: '30px', cursor: 'pointer'
                            }}>
                                {mode === 'week' ? 'Неделя' : mode === 'month' ? 'Месяц' : 'Квартал'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', position: 'relative' }}>
                <div style={{ width: totalWidth, position: 'relative' }}>
                    {/* Заголовки колонок */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.4)', position: 'sticky', top: 0, zIndex: 10 }}>
                        <div style={{ width: '280px', flexShrink: 0, padding: '12px 16px', fontWeight: 600, fontSize: 13, borderRight: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.4)' }}>
                            Учебная группа / Курс
                        </div>
                        <div style={{ display: 'flex' }}>
                            {allDates.map((date, i) => (
                                <div key={i} style={{
                                    width: columnWidth,
                                    flexShrink: 0,
                                    padding: '12px 4px',
                                    textAlign: 'center',
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: 'var(--text-tertiary)',
                                    borderRight: '1px solid var(--border-subtle)'
                                }}>
                                    {getColumnLabel(date)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Строки групп */}
                    {groups.map(group => {
                        const progress = calcProgress(group)
                        const isConflict = hasConflict(group, groups)
                        const { left, width } = getGroupPosition(group)
                        const courseName = getCourseName(group.courseId)
                        const statusColor = group.status === 'active' ? '#34d399' : group.status === 'done' ? '#6b7280' : '#fbbf24'
                        const isEditing = editingGroup === group.id
                        const isDragging = draggingGroup === group.id

                        return (
                            <div key={group.id} style={{
                                display: 'flex',
                                borderBottom: '1px solid var(--border-subtle)',
                                minHeight: '70px',
                                alignItems: 'center',
                                transition: 'background 0.2s',
                                opacity: isDragging ? 0.6 : 1,
                                background: isDragging ? 'rgba(77, 166, 255, 0.1)' : 'transparent'
                            }}>
                                {/* Левая колонка */}
                                <div style={{
                                    width: '280px',
                                    flexShrink: 0,
                                    padding: '12px 16px',
                                    borderRight: '1px solid var(--border-subtle)',
                                    background: isConflict ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{courseName}</span>
                                        <button onClick={() => startEditing(group)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }} title="Редактировать прогресс">
                                            <Edit2 size={12} />
                                        </button>
                                    </div>
                                    
                                    {isEditing ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 8 }}>
                                            <input type="range" min="0" max="100" value={editProgress} onChange={(e) => setEditProgress(Number(e.target.value))} style={{ flex: 1, height: '4px' }} />
                                            <span style={{ fontSize: 11, minWidth: '35px' }}>{editProgress}%</span>
                                            <button onClick={() => saveProgress(group.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399' }}><Check size={14} /></button>
                                            <button onClick={() => setEditingGroup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                {group.participants?.length || 0} участ. | {group.startDate} — {group.endDate}
                                            </div>
                                            <div style={{ fontSize: 11, marginTop: 4, color: statusColor }}>
                                                {group.status === 'active' ? '🟢 В процессе' : group.status === 'done' ? '✅ Завершено' : '⏳ Планируется'}
                                            </div>
                                            <div style={{ marginTop: 6 }}>
                                                <div className="progress-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                                    <div className="progress-bar-fill" style={{ width: `${progress}%`, height: '4px', background: statusColor, borderRadius: '4px' }} />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Правая область - таймлайн */}
                                <div style={{ position: 'relative', height: '70px', flex: 1 }}>
                                    {/* Вертикальные линии сетки */}
                                    <div style={{ display: 'flex', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                        {allDates.map((_, i) => (
                                            <div key={i} style={{ width: columnWidth, borderRight: '1px solid rgba(255,255,255,0.05)', height: '100%' }} />
                                        ))}
                                    </div>

                                    {/* Полоса группы */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: `${left}px`,
                                            width: `${width}px`,
                                            top: '15px',
                                            height: '40px',
                                            background: isConflict 
                                                ? 'linear-gradient(90deg, #ef4444, #ff6b6b)'
                                                : `linear-gradient(90deg, #4da6ff, ${progress > 50 ? '#34d399' : '#4da6ff'})`,
                                            borderRadius: '20px',
                                            transition: 'all 0.2s',
                                            border: isConflict ? '1px solid #ff4444' : '1px solid rgba(255,255,255,0.2)',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            cursor: 'grab'
                                        }}
                                        title={`${courseName}\nПрогресс: ${progress}%\nУчастников: ${group.participants?.length || 0}\n💡 Перетащите для изменения дат`}
                                        onMouseDown={(e) => handleDragStart(e, group)}
                                        onClick={(e) => { e.stopPropagation(); onGroupClick?.(group.id) }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${progress}%`,
                                            background: 'rgba(255,255,255,0.25)',
                                            transition: 'width 0.3s'
                                        }} />
                                        
                                        <div style={{
                                            position: 'relative',
                                            padding: '0 12px',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: '#fff',
                                            textShadow: '0 1px 1px rgba(0,0,0,0.2)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {courseName.length > 20 ? `${courseName.substring(0, 20)}...` : courseName} • {progress}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Информационные карточки */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '16px 20px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Всего групп</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{groups.length}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Активных групп</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#34d399' }}>
                        {groups.filter(g => g.status === 'active').length}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Всего курсов</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{courses.length}</div>
                </div>
            </div>
            
            {/* Подсказка */}
            <div style={{
                padding: '8px 20px',
                fontSize: 10,
                color: 'var(--text-tertiary)',
                borderTop: '1px solid var(--border-subtle)',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.15)'
            }}>
                💡 Перетащите полосу для изменения дат | Нажмите ✏️ для редактирования прогресса | Данные автоматически синхронизируются
            </div>
        </div>
    )
}