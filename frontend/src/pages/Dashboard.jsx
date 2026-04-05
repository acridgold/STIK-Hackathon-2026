import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    GraduationCap, BookOpen, Users, FileText,
    AlertTriangle, ChevronRight
} from 'lucide-react'
import { useStore, calcGroupProgress, calcSpecTotals } from '../store/useStore.js'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import GanttChart from '../components/GanttChart.jsx'


const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n))

export default function Dashboard() {
    const navigate = useNavigate()
    const { groups, courses, employees, companies, specifications } = useStore()

    const activeGroups = groups.filter(g => g.status === 'active')
    const plannedGroups = groups.filter(g => g.status === 'planned')
    const totalParticipants = groups.reduce((acc, g) => acc + g.participants.length, 0)

    // Конфликты расписания: группы с одним курсом и одной датой начала
    const conflicts = []
    const byCourseDateStart = {}
    groups.forEach(g => {
        const key = `${g.courseId}__${g.startDate}`
        if (!byCourseDateStart[key]) byCourseDateStart[key] = []
        byCourseDateStart[key].push(g)
    })
    Object.values(byCourseDateStart).forEach(arr => {
        if (arr.length > 1) conflicts.push(...arr)
    })
    const conflictIds = new Set(conflicts.map(g => g.id))

    // Итого по всем спецификациям
    const totalRevenue = specifications.reduce((acc, sp) => {
        const { total } = calcSpecTotals(sp, groups, courses)
        return acc + total
    }, 0)

    const recentGroups = [...groups]
        .sort((a, b) => b.startDate > a.startDate ? -1 : 1)
        .slice(0, 5)

    return (
        <div className="page-enter">
            <PageHeader
                title="Дашборд"
                subtitle="Общая сводка по системе корпоративного обучения"
            />

            {/* KPI stats */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    {
                        label: 'Учебных групп', value: groups.length,
                        sub: `${activeGroups.length} активных`,
                        icon: GraduationCap, color: '#4da6ff',
                        onClick: () => navigate('/groups'),
                    },
                    {
                        label: 'Курсов', value: courses.length,
                        sub: 'в каталоге',
                        icon: BookOpen, color: '#7c8ff5',
                        onClick: () => navigate('/courses'),
                    },
                    {
                        label: 'Сотрудников', value: employees.length,
                        sub: `${totalParticipants} участий`,
                        icon: Users, color: '#34d399',
                        onClick: () => navigate('/employees'),
                    },
                    {
                        label: 'Выручка (НДС)', value: `${fmt(totalRevenue)} ₽`,
                        sub: `${specifications.length} спецификаций`,
                        icon: FileText, color: '#fbbf24',
                        onClick: () => navigate('/specifications'),
                        small: true,
                    },
                ].map((s, i) => (
                    <div
                        key={i}
                        className="stat-card"
                        style={{ cursor: 'pointer' }}
                        onClick={s.onClick}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'flex-start',
                            justifyContent: 'space-between', marginBottom: 12,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${s.color}18`,
                                border: `1px solid ${s.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <s.icon size={16} color={s.color} />
                            </div>
                            <ChevronRight size={14} color="var(--text-tertiary)" />
                        </div>
                        <div className="stat-value" style={{ fontSize: s.small ? 20 : 28 }}>
                            {s.value}
                        </div>
                        <div className="stat-label">{s.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {s.sub}
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ marginBottom: 24 }}>
                <GanttChart 
                    groups={groups} 
                    courses={courses}
                    onGroupClick={(groupId) => navigate(`/groups/${groupId}`)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* Recent groups */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Учебные группы
            </span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate('/groups')}
                            style={{ fontSize: 12 }}
                        >
                            Все группы <ChevronRight size={12} />
                        </button>
                    </div>
                    <table>
                        <thead>
                        <tr>
                            <th>Курс</th>
                            <th>Период</th>
                            <th>Участников</th>
                            <th>Прогресс</th>
                            <th>Статус</th>
                        </tr>
                        </thead>
                        <tbody>
                        {recentGroups.map(g => {
                            const course = courses.find(c => c.id === g.courseId)
                            const progress = calcGroupProgress(g)
                            const isConflict = conflictIds.has(g.id)
                            return (
                                <tr
                                    key={g.id}
                                    onClick={() => navigate(`/groups/${g.id}`)}
                                    style={{
                                        cursor: 'pointer',
                                        background: isConflict ? 'rgba(251,191,36,0.04)' : undefined,
                                    }}
                                >
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {isConflict && (
                                                <AlertTriangle size={12} color="var(--accent-amber)" />
                                            )}
                                            <span style={{ fontWeight: 500, fontSize: 13 }}>
                          {course?.name || '—'}
                        </span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                        {g.startDate} — {g.endDate}
                                    </td>
                                    <td>
                                        <span style={{ fontSize: 13 }}>{g.participants.length}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 28 }}>
                          {progress}%
                        </span>
                                        </div>
                                    </td>
                                    <td><StatusBadge status={g.status} /></td>
                                </tr>
                            )
                        })}
                        {groups.length === 0 && (
                            <tr>
                                <td colSpan={5}>
                                    <div className="empty-state" style={{ padding: '32px 0' }}>
                                        <div className="empty-state-title">Нет групп обучения</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Conflicts */}
                    {conflicts.length > 0 && (
                        <div style={{
                            padding: '14px 16px',
                            background: 'rgba(251,191,36,0.06)',
                            border: '1px solid rgba(251,191,36,0.2)',
                            borderRadius: 'var(--radius-xl)',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: 10, fontSize: 13, fontWeight: 600,
                                color: 'var(--accent-amber)',
                            }}>
                                <AlertTriangle size={14} />
                                Конфликты расписания ({conflicts.length})
                            </div>
                            {[...new Set(conflicts.map(g => `${g.courseId}__${g.startDate}`))].map(key => {
                                const [courseId, date] = key.split('__')
                                const course = courses.find(c => c.id === courseId)
                                const grps = conflicts.filter(g => g.courseId === courseId && g.startDate === date)
                                return (
                                    <div key={key} style={{
                                        padding: '8px 10px',
                                        background: 'rgba(251,191,36,0.06)',
                                        borderRadius: 8,
                                        marginBottom: 6,
                                        fontSize: 12,
                                    }}>
                                        <div style={{ fontWeight: 500, marginBottom: 2 }}>
                                            {course?.name}
                                        </div>
                                        <div style={{ color: 'var(--text-tertiary)' }}>
                                            {date} · {grps.length} группы
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Companies breakdown */}
                    <div className="glass-card" style={{ padding: 16 }}>
                        <div style={{
                            fontSize: 13, fontWeight: 600, letterSpacing: '-0.02em',
                            marginBottom: 12,
                        }}>
                            По компаниям
                        </div>
                        {companies.map(company => {
                            const empCount = employees.filter(e => e.companyId === company.id).length
                            const specCount = specifications.filter(s => s.companyId === company.id).length
                            return (
                                <div key={company.id} style={{
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    fontSize: 12,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 26, height: 26, borderRadius: 6,
                                            background: 'var(--glass-3)',
                                            border: '1px solid var(--border-default)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 9, fontWeight: 700, color: 'var(--accent-blue)',
                                            letterSpacing: '0.02em',
                                        }}>
                                            {company.code}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{company.name}</span>
                                    </div>
                                    <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                                        {empCount} сотр. · {specCount} спец.
                                    </div>
                                </div>
                            )
                        })}
                        {companies.length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                Нет компаний
                            </div>
                        )}
                    </div>

                    {/* Quick stats */}
                    <div className="glass-card" style={{ padding: 16 }}>
                        <div style={{
                            fontSize: 13, fontWeight: 600, letterSpacing: '-0.02em',
                            marginBottom: 12,
                        }}>
                            Статистика групп
                        </div>
                        {[
                            { label: 'Планируется', count: plannedGroups.length, color: 'var(--status-planned)' },
                            { label: 'В процессе', count: activeGroups.length, color: 'var(--status-active)' },
                            { label: 'Завершено', count: groups.filter(g => g.status === 'done').length, color: 'var(--text-tertiary)' },
                        ].map(s => (
                            <div key={s.label} style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                fontSize: 12,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: s.color, flexShrink: 0,
                                    }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                                </div>
                                <span style={{ fontWeight: 600, color: s.color }}>{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}