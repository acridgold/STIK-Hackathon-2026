import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle, ChevronRight } from 'lucide-react'
import { useStore, calcGroupProgress, calcGroupCost } from '../store/useStore.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBadge, { STATUS_OPTIONS } from '../components/ui/StatusBadge.jsx'
import GroupModal from '../components/ui/GroupModal.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n))

export default function GroupsPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const { groups, courses } = useStore()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Конфликты
    const byCourseDateStart = {}
    groups.forEach(g => {
        const key = `${g.courseId}__${g.startDate}`
        if (!byCourseDateStart[key]) byCourseDateStart[key] = []
        byCourseDateStart[key].push(g)
    })
    const conflictIds = new Set()
    Object.values(byCourseDateStart).forEach(arr => {
        if (arr.length > 1) arr.forEach(g => conflictIds.add(g.id))
    })

    const filtered = groups.filter(g => {
        const course = courses.find(c => c.id === g.courseId)
        const matchSearch = !search || course?.name.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || g.status === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="page-enter">
            <PageHeader
                title="Учебные группы"
                subtitle={`${groups.length} групп · ${groups.reduce((a, g) => a + g.participants.length, 0)} участников`}
                actions={
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={14} /> Новая группа
                    </button>
                }
            />

            {/* Filters */}
            <div style={{ 
                display: 'flex', 
                gap: isMobile ? 8 : 10, 
                marginBottom: 20, 
                alignItems: 'center',
                flexWrap: 'wrap',
            }}>
                <div style={{ position: 'relative', flex: isMobile ? '1 1 auto' : '1', maxWidth: isMobile ? '100%' : 300 }}>
                    <Search size={13} style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary)',
                    }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 30, minWidth: isMobile ? '100%' : 'auto' }}
                        placeholder={isMobile ? "Поиск..." : "Поиск по курсу..."}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="pill-tabs" style={{ overflowX: isMobile ? 'auto' : 'visible', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
                    <button
                        className={`pill-tab ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        Все
                    </button>
                    {STATUS_OPTIONS.map(o => (
                        <button
                            key={o.value}
                            className={`pill-tab ${statusFilter === o.value ? 'active' : ''}`}
                            onClick={() => setStatusFilter(o.value)}
                        >
                            {isMobile ? o.label.slice(0, 3) : o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th>Курс</th>
                            <th className="hide-on-mobile">Период</th>
                            <th style={{ textAlign: 'center' }}>Участников</th>
                            <th className="hide-on-mobile">Прогресс</th>
                            <th className="hide-on-mobile" style={{ textAlign: 'right' }}>Стоимость</th>
                            <th>Статус</th>
                            <th className="hide-on-mobile">Спецификация</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(g => {
                            const course = courses.find(c => c.id === g.courseId)
                            const progress = calcGroupProgress(g)
                            const cost = calcGroupCost(g, course)
                            const isConflict = conflictIds.has(g.id)

                            return (
                                <tr
                                    key={g.id}
                                    onClick={() => navigate(`/groups/${g.id}`)}
                                    style={{
                                        cursor: 'pointer',
                                        background: isConflict ? 'rgba(251,191,36,0.03)' : undefined,
                                    }}
                                >
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            {isConflict && (
                                                <div className="tooltip-wrapper">
                                                    <AlertTriangle size={13} color="var(--accent-amber)" />
                                                    <div className="tooltip-popup">Конфликт расписания</div>
                                                </div>
                                            )}
                                            <span style={{ fontWeight: 500 }}>{course?.name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                        {g.startDate} — {g.endDate}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{
                          background: 'var(--glass-2)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                      }}>
                        {g.participants.length}
                      </span>
                                    </td>
                                    <td className="hide-on-mobile">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 28 }}>
                          {progress}%
                        </span>
                                        </div>
                                    </td>
                                    <td className="hide-on-mobile" style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                        {cost > 0 ? `${fmt(cost)} ₽` : '—'}
                                    </td>
                                    <td><StatusBadge status={g.status} /></td>
                                    <td className="hide-on-mobile" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                                        {g.specId ? `#${g.specId.slice(0, 6)}` : '—'}
                                    </td>
                                    <td>
                                        <ChevronRight size={14} color="var(--text-tertiary)" />
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8}>
                                    <div className="empty-state">
                                        <div className="empty-state-title">Нет групп</div>
                                        <div className="empty-state-desc">
                                            Создайте первую учебную группу, нажав «Новая группа»
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <GroupModal
                    onClose={() => setShowModal(false)}
                    onSaved={() => {
                        setShowModal(false)
                        toast('Группа создана', 'success')
                    }}
                />
            )}
        </div>
    )
}