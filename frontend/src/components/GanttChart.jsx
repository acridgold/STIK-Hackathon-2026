import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Calendar, AlertCircle, Download, Upload } from 'lucide-react'
import { useStore } from '../store/useStore.js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function GanttChart({ groups = [], courses = [], onGroupClick }) {
    const [viewMode, setViewMode] = useState('month')
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    const scrollRef = useRef(null)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Получение названия курса
    const getCourseName = (courseId) => {
        const course = courses.find(c => c.id === courseId)
        return course ? course.name : 'Курс не выбран'
    }

    // Расчет прогресса группы
    const calcProgress = (group) => {
        if (!group.participants?.length) return 0
        const sum = group.participants.reduce((acc, p) => acc + (p.progress || 0), 0)
        return Math.round(sum / group.participants.length)
    }

    // Проверка конфликтов
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

    // Определение всех дат для шкалы
    const { allDates, minDate, maxDate } = useMemo(() => {
        if (!groups.length) {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth() + 3, 0)
            return { allDates: [], minDate: start, maxDate: end }
        }
        
        let min = new Date(groups[0].startDate)
        let max = new Date(groups[0].endDate)
        groups.forEach(g => {
            const start = new Date(g.startDate)
            const end = new Date(g.endDate)
            if (start < min) min = start
            if (end > max) max = end
        })
        
        // Добавляем отступ по 30 дней
        const paddedMin = new Date(min)
        paddedMin.setDate(min.getDate() - 30)
        const paddedMax = new Date(max)
        paddedMax.setDate(max.getDate() + 30)
        
        // Генерируем массив дат для колонок
        const dates = []
        let current = new Date(paddedMin)
        while (current <= paddedMax) {
            dates.push(new Date(current))
            if (viewMode === 'week') {
                current.setDate(current.getDate() + 7)
            } else if (viewMode === 'month') {
                current.setMonth(current.getMonth() + 1)
            } else {
                current.setMonth(current.getMonth() + 3)
            }
        }
        
        return { allDates: dates, minDate: paddedMin, maxDate: paddedMax }
    }, [groups, viewMode])

    // Ширина колонки в пикселях
    const columnWidth = viewMode === 'week' ? 100 : viewMode === 'month' ? 120 : 150
    
    // Общая ширина контейнера
    const totalWidth = allDates.length * columnWidth + 250 // 250px - ширина левой колонки

    // Позиция группы (в пикселях, а не процентах!)
    const getGroupPosition = (group) => {
        const groupStart = new Date(group.startDate)
        const groupEnd = new Date(group.endDate)
        
        // Находим индекс начальной колонки
        let startIndex = 0
        let endIndex = allDates.length - 1
        
        for (let i = 0; i < allDates.length; i++) {
            const colDate = allDates[i]
            const nextColDate = allDates[i + 1] || new Date(colDate.getTime() + 30 * 24 * 60 * 60 * 1000)
            
            if (groupStart >= colDate && groupStart < nextColDate) {
                startIndex = i
            }
            if (groupEnd >= colDate && groupEnd < nextColDate) {
                endIndex = i
                break
            }
        }
        
        const left = startIndex * columnWidth
        const width = (endIndex - startIndex + 1) * columnWidth
        
        return { left, width }
    }

    // Форматирование заголовка колонки
    const getColumnLabel = (date) => {
        if (viewMode === 'week') {
            const weekNum = Math.ceil(date.getDate() / 7)
            return `${weekNum}/${date.getMonth() + 1}`
        } else if (viewMode === 'month') {
            return date.toLocaleString('ru', { month: 'short' })
        } else {
            const quarter = Math.floor(date.getMonth() / 3) + 1
            return `${quarter} кв`
        }
    }

    // Экспорт в PDF
    const exportToPDF = async () => {
        const element = document.getElementById('gantt-container')
        if (!element) return
        
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#1a1a2e',
                logging: false
            })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('landscape')
            pdf.addImage(imgData, 'PNG', 5, 5, 290, 150)
            pdf.save(`gantt-chart-${new Date().toISOString().slice(0, 10)}.pdf`)
        } catch (error) {
            console.error('Ошибка экспорта PDF:', error)
            alert('Не удалось создать PDF')
        }
    }

    // Скролл к текущей дате
    useEffect(() => {
        if (scrollRef.current && allDates.length > 0) {
            const today = new Date()
            let todayIndex = 0
            for (let i = 0; i < allDates.length; i++) {
                if (allDates[i] <= today && (!allDates[i + 1] || allDates[i + 1] > today)) {
                    todayIndex = i
                    break
                }
            }
            const scrollTo = todayIndex * columnWidth - 200
            if (scrollTo > 0) {
                scrollRef.current.scrollLeft = scrollTo
            }
        }
    }, [allDates, columnWidth])
       const handleXMLUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    const text = await file.text()
    const result = useStore.getState().importFromXML(text)
    
    if (result.success) {
        alert(`✅ Импорт завершён!\nГрупп: ${result.imported.groups}\nКурсов: ${result.imported.courses}\nСотрудников: ${result.imported.employees}\nКомпаний: ${result.imported.companies}`)
        window.location.reload()
    } else {
        alert(`❌ Ошибка импорта: ${result.error}`)
    }
}
    if (!groups.length) {
        return (
            <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <AlertCircle size={24} color="var(--accent-blue)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Нет групп для отображения. Создайте учебную группу.
                </p>
            </div>
        )
    }

    return (
        <div id="gantt-container" className="glass-card gantt-container" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: isMobile ? '12px 14px' : '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: isMobile ? '8px' : '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={isMobile ? 16 : 18} color="var(--accent-blue)" />
                    <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600 }}>Диаграмма Ганта</span>
                    {groups.some(g => hasConflict(g, groups)) && (
                        <span style={{
                            fontSize: 10,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '2px 6px',
                            borderRadius: '20px'
                        }}>
                            ⚠️ Конфликты
                        </span>
                    )}
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '6px' : '12px', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                }}>
                        <input
        type="file"
        accept=".xml"
        id="xml-upload"
        style={{ display: 'none' }}
        onChange={handleXMLUpload}
    />
    <button
        onClick={() => document.getElementById('xml-upload').click()}
        style={{
            padding: isMobile ? '5px 10px' : '6px 14px',
            fontSize: isMobile ? 10 : 12,
            fontWeight: 500,
            background: 'rgba(77, 166, 255, 0.2)',
            color: 'var(--accent-blue)',
            border: '1px solid rgba(77, 166, 255, 0.3)',
            borderRadius: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
        }}
    >
        <Upload size={isMobile ? 12 : 14} />
        {!isMobile && 'Загрузить XML'}
    </button>
                    <button
                        onClick={exportToPDF}
                        style={{
                            padding: isMobile ? '5px 10px' : '6px 14px',
                            fontSize: isMobile ? 10 : 12,
                            fontWeight: 500,
                            background: 'rgba(77, 166, 255, 0.2)',
                            color: 'var(--accent-blue)',
                            border: '1px solid rgba(77, 166, 255, 0.3)',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Download size={isMobile ? 12 : 14} />
                        {!isMobile && 'Экспорт PDF'}
                    </button>
                    
                    <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '40px' }}>
                        {['week', 'month', 'quarter'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    padding: isMobile ? '3px 8px' : '4px 12px',
                                    fontSize: isMobile ? 10 : 12,
                                    fontWeight: 500,
                                    background: viewMode === mode ? 'var(--accent-blue)' : 'transparent',
                                    color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: '30px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {mode === 'week' ? 'Неделя' : mode === 'month' ? 'Месяц' : 'Кв.'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Область диаграммы с горизонтальным скроллом */}
            <div 
                ref={scrollRef} 
                style={{ 
                    overflowX: 'auto', 
                    overflowY: 'auto', 
                    maxHeight: '500px',
                    position: 'relative'
                }}
            >
                <div style={{ width: totalWidth, position: 'relative' }}>
                    {/* Заголовки колонок */}
                    <div style={{ 
                        display: 'flex', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        background: 'rgba(0,0,0,0.4)', 
                        position: 'sticky', 
                        top: 0, 
                        zIndex: 10 
                    }}>
                        <div style={{ 
                            width: '250px', 
                            flexShrink: 0, 
                            padding: '12px 16px', 
                            fontWeight: 600, 
                            fontSize: 13, 
                            borderRight: '1px solid var(--border-subtle)',
                            background: 'rgba(0,0,0,0.4)'
                        }}>
                            Учебная группа / Курс
                        </div>
                        <div style={{ display: 'flex' }}>
                            {allDates.map((date, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: columnWidth,
                                        flexShrink: 0,
                                        padding: '12px 4px',
                                        textAlign: 'center',
                                        fontSize: 11,
                                        fontWeight: 500,
                                        color: 'var(--text-tertiary)',
                                        borderRight: '1px solid var(--border-subtle)'
                                    }}
                                >
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

                        return (
                            <div
                                key={group.id}
                                style={{
                                    display: 'flex',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    minHeight: '64px',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onClick={() => onGroupClick?.(group.id)}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {/* Левая колонка с информацией */}
                                <div style={{
                                    width: '250px',
                                    flexShrink: 0,
                                    padding: '12px 16px',
                                    borderRight: '1px solid var(--border-subtle)',
                                    background: isConflict ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                                        {courseName}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                        {group.participants?.length || 0} участ. | {group.startDate} — {group.endDate}
                                    </div>
                                    <div style={{ fontSize: 11, marginTop: 4, color: statusColor }}>
                                        {group.status === 'active' ? '🟢 В процессе' : group.status === 'done' ? '✅ Завершено' : '⏳ Планируется'}
                                    </div>
                                </div>

                                {/* Область с сеткой и полосами */}
                                <div style={{ position: 'relative', height: '80px', flex: 1 }}>
                                    {/* Вертикальные линии сетки */}
                                    <div style={{ display: 'flex', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                        {allDates.map((_, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: columnWidth,
                                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                                    height: '100%'
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Полоса группы */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: left,
                                            width: width > 5 ? width : 5,
                                            top: '20px',
                                            height: '40px',
                                            background: isConflict 
                                                ? 'linear-gradient(90deg, #ef4444, #ff6b6b)'
                                                : `linear-gradient(90deg, #4da6ff, ${progress > 50 ? '#34d399' : '#4da6ff'})`,
                                            borderRadius: '20px',
                                            transition: 'all 0.2s',
                                            border: isConflict ? '1px solid #ff4444' : '1px solid rgba(255,255,255,0.2)',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            cursor: 'pointer'
                                        }}
                                        title={`${courseName}\nПрогресс: ${progress}%\nУчастников: ${group.participants?.length || 0}`}
                                    >
                                        {/* Индикатор прогресса */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: `${progress}%`,
                                                background: 'rgba(255,255,255,0.3)',
                                                transition: 'width 0.3s'
                                            }}
                                        />
                                        
                                        {/* Текст */}
                                        <div
                                            style={{
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
                                            }}
                                        >
                                            {courseName.length > 20 ? `${courseName.substring(0, 20)}...` : courseName} • {progress}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/*Информационные карточки*/}
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
        </div>
    )
}