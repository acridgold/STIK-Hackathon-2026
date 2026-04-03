import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Calendar, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function GanttChart({ groups = [], courses = [], onGroupClick }) {
    const [viewMode, setViewMode] = useState('month')
    const scrollRef = useRef(null)

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

    // Расчет стоимости группы
    const calcCost = (group) => {
        const course = courses.find(c => c.id === group.courseId)
        if (!course || !group.participants) return 0
        const price = course.priceHistory?.[course.priceHistory.length - 1]?.price || 0
        return price * group.participants.length
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

    // Определение границ временной шкалы
    const { minDate, maxDate } = useMemo(() => {
        if (!groups.length) {
            const now = new Date()
            return { minDate: now, maxDate: new Date(now.setMonth(now.getMonth() + 3)) }
        }
        let min = new Date(groups[0].startDate)
        let max = new Date(groups[0].endDate)
        groups.forEach(g => {
            const start = new Date(g.startDate)
            const end = new Date(g.endDate)
            if (start < min) min = start
            if (end > max) max = end
        })
        return { minDate: min, maxDate: max }
    }, [groups])

    // Генерация колонок временной шкалы
    const timelineColumns = useMemo(() => {
        const columns = []
        let current = new Date(minDate)
        const end = new Date(maxDate)

        while (current <= end) {
            let label = ''
            let width = 100
            const date = new Date(current)

            switch (viewMode) {
                case 'week':
                    label = `Нед ${Math.ceil(date.getDate() / 7)}/${date.getMonth() + 1}`
                    current.setDate(current.getDate() + 7)
                    width = 80
                    break
                case 'month':
                    label = date.toLocaleString('ru', { month: 'short' })
                    current.setMonth(current.getMonth() + 1)
                    width = 100
                    break
                case 'quarter':
                    const quarter = Math.floor(date.getMonth() / 3) + 1
                    label = `${quarter} кв`
                    current.setMonth(current.getMonth() + 3)
                    width = 120
                    break
                default:
                    label = date.toLocaleString('ru', { month: 'short' })
                    current.setMonth(current.getMonth() + 1)
                    width = 100
            }
            columns.push({ label, width, date: new Date(date) })
        }
        return columns
    }, [minDate, maxDate, viewMode])

    // Расчет позиции группы на шкале
    const getGroupStyle = (group) => {
        const totalDuration = maxDate.getTime() - minDate.getTime()
        const start = new Date(group.startDate).getTime() - minDate.getTime()
        const end = new Date(group.endDate).getTime() - minDate.getTime()
        const left = (start / totalDuration) * 100
        const width = ((end - start) / totalDuration) * 100
        return { left: `${left}%`, width: `${width}%` }
    }

    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
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
                        <span style={{
                            fontSize: 11,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '2px 8px',
                            borderRadius: '20px'
                        }}>
                            ⚠️ Конфликты
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '40px' }}>
                    {['week', 'month', 'quarter'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                padding: '4px 12px',
                                fontSize: 12,
                                fontWeight: 500,
                                background: viewMode === mode ? 'var(--accent-blue)' : 'transparent',
                                color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '30px',
                                cursor: 'pointer'
                            }}
                        >
                            {mode === 'week' ? 'Неделя' : mode === 'month' ? 'Месяц' : 'Квартал'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Диаграмма */}
            {!groups.length ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <AlertCircle size={24} color="var(--accent-blue)" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        Нет групп для отображения. Создайте учебную группу.
                    </p>
                </div>
            ) : (
                <div ref={scrollRef} style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: '800px' }}>
                        {/* Заголовки колонок */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ width: '250px', flexShrink: 0, padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>
                                Учебная группа / Курс
                            </div>
                            <div style={{ display: 'flex', flex: 1 }}>
                                {timelineColumns.map((col, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: col.width,
                                            flexShrink: 0,
                                            padding: '12px 4px',
                                            textAlign: 'center',
                                            fontSize: 11,
                                            fontWeight: 500,
                                            color: 'var(--text-tertiary)',
                                            borderRight: '1px solid var(--border-subtle)'
                                        }}
                                    >
                                        {col.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Строки групп */}
                        {groups.map(group => {
                            const progress = calcProgress(group)
                            const isConflict = hasConflict(group, groups)
                            const style = getGroupStyle(group)

                            return (
                                <div
                                    key={group.id}
                                    style={{
                                        display: 'flex',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        minHeight: '64px',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => onGroupClick?.(group.id)}
                                >
                                    {/* Информация о группе */}
                                    <div style={{
                                        width: '250px',
                                        flexShrink: 0,
                                        padding: '12px 16px',
                                        borderRight: '1px solid var(--border-subtle)',
                                        background: isConflict ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                                            {getCourseName(group.courseId)}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                            {group.participants?.length || 0} участ.
                                        </div>
                                    </div>

                                    {/* Таймлайн */}
                                    <div style={{ position: 'relative', flex: 1, height: '64px' }}>
                                        {/* Сетка */}
                                        <div style={{ display: 'flex', position: 'absolute', inset: 0 }}>
                                            {timelineColumns.map((_, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        width: _.width,
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
                                                ...style,
                                                top: '12px',
                                                height: '40px',
                                                background: `linear-gradient(90deg, ${isConflict ? '#ef4444' : '#4da6ff'} 0%, ${progress > 50 ? '#34d399' : isConflict ? '#ef4444' : '#4da6ff'} 100%)`,
                                                borderRadius: '8px',
                                                transition: 'all 0.2s',
                                                border: isConflict ? '2px solid #ff4444' : '1px solid rgba(255,255,255,0.2)',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: `${progress}%`,
                                                    background: 'rgba(255,255,255,0.25)'
                                                }}
                                            />
                                            <div
                                                style={{
                                                    position: 'relative',
                                                    padding: '0 10px',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    color: '#fff',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {getCourseName(group.courseId)} ({progress}%)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Информационные карточки */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '20px',
                borderTop: '1px solid var(--border-subtle)'
            }}>
                {[
                    { label: 'Всего групп', value: groups.length },
                    { label: 'Активных групп', value: groups.filter(g => g.status === 'active').length },
                    { label: 'Всего курсов', value: courses.length }
                ].map((item, i) => (
                    <div key={i} style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                            {item.label}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}