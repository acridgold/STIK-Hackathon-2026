import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Calendar, AlertCircle, Download, Upload, Edit2, Check, X, RefreshCw } from 'lucide-react'
import { useStore } from '../store/useStore.js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { syncAll, updateGroup as apiUpdateGroup, updateProgress as apiUpdateProgress } from '../components/api/apiService.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ── Хелперы ──────────────────────────────────────────────────────────────

function mergeById(existing, incoming) {
    const map = new Map(existing.map(x => [x.id, x]))
    incoming.forEach(x => map.set(x.id, x))
    return Array.from(map.values())
}

function mapStatus(status) {
    switch (status) {
        case 'Планируется': return 'planned'
        case 'В процессе':  return 'active'
        case 'Завершено':   return 'done'
        case 'Отменено':    return 'cancelled'
        default:            return status ?? 'planned'
    }
}

function mapGroup(g) {
    return {
        id:                String(g.group_id ?? g.id),
        courseId:          String(g.course_id ?? g.courseId ?? ''),
        courseName:        g.course_name ?? g.courseName ?? '',
        startDate:         g.start_date ?? g.startDate,
        endDate:           g.end_date ?? g.endDate,
        status:            mapStatus(g.status),
        specificationId:   g.specification_id ?? null,
        pricePerPerson:    g.actual_price_per_person ?? g.pricePerPerson ?? 0,
        participantsCount: g.participants_count ?? g.participantsCount ?? (g.participants?.length ?? 0),
        averageProgress:   parseFloat(g.average_progress ?? g.averageProgress ?? 0),
        participants:      g.participants ?? [],
    }
}

function mapCourse(c) {
    return {
        id:             String(c.course_id ?? c.id),
        name:           c.course_name ?? c.name,
        description:    c.description ?? '',
        durationDays:   c.duration_days ?? c.durationDays,
        pricePerPerson: c.price_per_person ?? c.pricePerPerson,
    }
}

function mapEmployee(e) {
    return {
        id:        String(e.employee_id ?? e.id),
        fullName:  e.full_name ?? e.fullName,
        companyId: e.company_id ? String(e.company_id) : (e.companyId ?? null),
        email:     e.email ?? '',
    }
}

// ─────────────────────────────────────────────────────────────────────────

export default function GanttChart({ groups = [], courses = [], onGroupClick }) {
    const [viewMode, setViewMode]           = useState('month')
    const [draggingGroup, setDraggingGroup] = useState(null)
    const [dragStart, setDragStart]         = useState({ x: 0, originalStartDate: null })
    const [editingGroup, setEditingGroup]   = useState(null)
    const [editProgress, setEditProgress]   = useState(0)
    const [isSyncing, setIsSyncing]         = useState(false)
    const [lastSyncTime, setLastSyncTime]   = useState(null)
    const [syncError, setSyncError]         = useState(null)
    const [uploadError, setUploadError]     = useState(null)
    const [uploadStats, setUploadStats]     = useState(null)

    const scrollRef = useRef(null)

    const { updateGroup, updateParticipantProgress, setGroups, setCourses, setEmployees } = useStore()

    // ── Хелперы ──────────────────────────────────────────────────────

    const getCourseName = (courseId, courseName) => {
        if (courseName) return courseName
        const course = courses.find(c => c.id === courseId)
        return course ? course.name : 'Курс не выбран'
    }

    const calcProgress = (group) => {
        if (group.participants?.length) {
            const sum = group.participants.reduce((acc, p) => acc + (p.progress || 0), 0)
            return Math.round(sum / group.participants.length)
        }
        return Math.round(group.averageProgress ?? 0)
    }

    const hasConflict = (group, allGroups) => {
        const cur = new Set(group.participants?.map(p => p.employeeId) || [])
        if (!cur.size) return false
        return allGroups.some(other => {
            if (other.id === group.id) return false
            const oth = new Set(other.participants?.map(p => p.employeeId) || [])
            if (!oth.size) return false
            const aS = new Date(group.startDate), aE = new Date(group.endDate)
            const bS = new Date(other.startDate), bE = new Date(other.endDate)
            if (!(aS <= bE && bS <= aE)) return false
            for (let e of cur) if (oth.has(e)) return true
            return false
        })
    }

    // ── Синхронизация ────────────────────────────────────────────────

    const loadFromBackend = async () => {
        setIsSyncing(true)
        setSyncError(null)
        try {
            const result = await syncAll()
            if (result.success) {
                if (result.groups)    setGroups(result.groups.map(mapGroup))
                if (result.courses)   setCourses(result.courses.map(mapCourse))
                if (result.employees) setEmployees(result.employees.map(mapEmployee))
                setLastSyncTime(new Date())
            } else {
                setSyncError('Бэкенд недоступен')
            }
        } catch {
            setSyncError('Ошибка соединения')
        } finally {
            setIsSyncing(false)
        }
    }

    useEffect(() => { loadFromBackend() }, [])

    // ── Загрузка XML → бэкенд → JSON → стор ─────────────────────────

    const handleXMLUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        event.target.value = ''

        setIsSyncing(true)
        setUploadError(null)
        setUploadStats(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res  = await fetch(`${API_BASE}/api/xml/upload`, { method: 'POST', body: formData })
            const data = await res.json()

            if (!res.ok || !data.success) {
                setUploadError(data.error || `Ошибка ${res.status}`)
                return
            }

            const { groups: g, courses: c, employees: e, stats } = data

            if (g?.length) setGroups(prev => mergeById(prev, g.map(mapGroup)))
            if (c?.length) setCourses(prev => mergeById(prev, c.map(mapCourse)))
            if (e?.length) setEmployees(prev => mergeById(prev, e.map(mapEmployee)))

            setLastSyncTime(new Date())
            setUploadStats(stats)
        } catch (err) {
            setUploadError('Бэкенд недоступен: ' + err.message)
        } finally {
            setIsSyncing(false)
        }
    }

    // ── Прогресс ─────────────────────────────────────────────────────

    const updateGroupProgress = async (groupId, newProgress) => {
        const group = groups.find(g => g.id === groupId)
        if (!group?.participants?.length) return
        for (const p of group.participants) {
            updateParticipantProgress(groupId, p.id, newProgress)
            await apiUpdateProgress(groupId, p.id, newProgress)
        }
    }

    const startEditing  = (group) => { setEditingGroup(group.id); setEditProgress(calcProgress(group)) }
    const saveProgress  = async (groupId) => { await updateGroupProgress(groupId, editProgress); setEditingGroup(null) }

    // ── Временная шкала ──────────────────────────────────────────────

    const { allDates, minDate, maxDate, pixelsPerDay } = useMemo(() => {
        const cw  = viewMode === 'week' ? 100 : viewMode === 'month' ? 120 : 150
        const ppd = cw / (viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 90)

        const buildDates = (start, end) => {
            const dates = []; let cur = new Date(start)
            while (cur <= end) {
                dates.push(new Date(cur))
                if (viewMode === 'week')       cur.setDate(cur.getDate() + 7)
                else if (viewMode === 'month') cur.setMonth(cur.getMonth() + 1)
                else                           cur.setMonth(cur.getMonth() + 3)
            }
            return dates
        }

        if (!groups.length) {
            const now = new Date()
            const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const e = new Date(now.getFullYear(), now.getMonth() + 3, 0)
            return { allDates: buildDates(s, e), minDate: s, maxDate: e, pixelsPerDay: ppd }
        }

        let min = new Date(groups[0].startDate), max = new Date(groups[0].endDate)
        groups.forEach(g => {
            const s = new Date(g.startDate), e = new Date(g.endDate)
            if (s < min) min = s; if (e > max) max = e
        })
        const pMin = new Date(min.getFullYear(), min.getMonth() - 1, 1)
        const pMax = new Date(max.getFullYear(), max.getMonth() + 2, 0)
        return { allDates: buildDates(pMin, pMax), minDate: pMin, maxDate: pMax, pixelsPerDay: ppd }
    }, [groups, viewMode])

    const columnWidth = viewMode === 'week' ? 100 : viewMode === 'month' ? 120 : 150
    const totalWidth  = allDates.length * columnWidth + 280

    const getGroupPosition = (group) => {
        const s = new Date(group.startDate), e = new Date(group.endDate)
        return {
            left:  Math.max(0, (s - minDate) / 86400000 * pixelsPerDay),
            width: Math.max((e - s) / 86400000 * pixelsPerDay, 30),
        }
    }

    const getColumnLabel = (date) => {
        if (viewMode === 'week')  return `${date.getDate()}/${date.getMonth() + 1}`
        if (viewMode === 'month') return date.toLocaleString('ru', { month: 'short' })
        return `${Math.floor(date.getMonth() / 3) + 1} кв`
    }

    // ── Scroll to today ──────────────────────────────────────────────

    useEffect(() => {
        if (!scrollRef.current || !minDate || !maxDate) return
        const today = new Date()
        if (today >= minDate && today <= maxDate) {
            const offset = (today - minDate) / 86400000 * pixelsPerDay - 300
            if (offset > 0) scrollRef.current.scrollLeft = offset
        }
    }, [minDate, maxDate, pixelsPerDay])

    // ── Drag-and-drop ────────────────────────────────────────────────

    const handleDragStart = (e, group) => {
        e.preventDefault(); e.stopPropagation()
        setDraggingGroup(group.id)
        setDragStart({ x: e.clientX, originalStartDate: new Date(group.startDate) })
    }

    const handleDragMove = (e) => {
        if (!draggingGroup) return
        const deltaDays = Math.round((e.clientX - dragStart.x) / pixelsPerDay)
        if (!deltaDays) return
        const group = groups.find(g => g.id === draggingGroup)
        if (!group) return
        const newStart = new Date(dragStart.originalStartDate)
        newStart.setDate(newStart.getDate() + deltaDays)
        const newEnd = new Date(group.endDate)
        newEnd.setDate(newEnd.getDate() + deltaDays)
        const minB = new Date(minDate); minB.setDate(minDate.getDate() + 1)
        const maxB = new Date(maxDate); maxB.setDate(maxDate.getDate() - 1)
        if (newStart >= minB && newEnd <= maxB) {
            updateGroup(draggingGroup, {
                startDate: newStart.toISOString().split('T')[0],
                endDate:   newEnd.toISOString().split('T')[0],
            })
            setDragStart({ x: e.clientX, originalStartDate: newStart })
        }
    }

    const handleDragEnd = () => {
        if (!draggingGroup) return
        const group = groups.find(g => g.id === draggingGroup)
        if (group) apiUpdateGroup(draggingGroup, { start_date: group.startDate, end_date: group.endDate })
        setDraggingGroup(null)
    }

    useEffect(() => {
        if (!draggingGroup) return
        window.addEventListener('mousemove', handleDragMove)
        window.addEventListener('mouseup', handleDragEnd)
        return () => {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
        }
    }, [draggingGroup, dragStart, pixelsPerDay])

    // ── PDF ──────────────────────────────────────────────────────────

    const exportToPDF = async () => {
        const el = document.getElementById('gantt-container')
        if (!el) return
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#05050a', logging: false })
            const pdf = new jsPDF('landscape')
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 5, 5, 290, 150)
            pdf.save(`gantt-${new Date().toISOString().slice(0, 10)}.pdf`)
        } catch { alert('Не удалось создать PDF') }
    }

    // ── Empty state ──────────────────────────────────────────────────

    if (!groups.length) {
        return (
            <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <AlertCircle size={24} color="var(--accent-a)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: 'var(--text-1)' }}>
                    Нет групп. Загрузите XML или создайте группу вручную.
                </p>
                {syncError  && <p style={{ fontSize: 12, color: 'var(--accent-d)', marginTop: 8 }}>{syncError}</p>}
                {uploadError && <p style={{ fontSize: 12, color: 'var(--accent-d)', marginTop: 8 }}>{uploadError}</p>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={loadFromBackend} disabled={isSyncing}>
                        <RefreshCw size={14} /> {isSyncing ? 'Загрузка...' : 'Синхронизировать'}
                    </button>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        <Upload size={14} /> Загрузить XML
                        <input type="file" accept=".xml" style={{ display: 'none' }} onChange={handleXMLUpload} />
                    </label>
                </div>
            </div>
        )
    }

    // ── Render ───────────────────────────────────────────────────────

    return (
        <div id="gantt-container" className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>

            {/* Шапка */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-0)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Calendar size={18} color="var(--accent-a)" />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>
                        Диаграмма Ганта
                    </span>
                    {groups.some(g => hasConflict(g, groups)) && (
                        <span className="badge badge-danger">Конфликты</span>
                    )}
                    {lastSyncTime && (
                        <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                            Синх. {lastSyncTime.toLocaleTimeString()}
                        </span>
                    )}
                    {syncError   && <span style={{ fontSize: 10, color: 'var(--accent-d)' }}>{syncError}</span>}
                    {uploadStats && (
                        <span style={{ fontSize: 11, color: 'var(--accent-b)' }}>
                            ✓ групп: {uploadStats.groups_imported}
                            {uploadStats.courses_imported   > 0 && ` · курсов: ${uploadStats.courses_imported}`}
                            {uploadStats.employees_imported > 0 && ` · сотр.: ${uploadStats.employees_imported}`}
                        </span>
                    )}
                    {uploadError && <span style={{ fontSize: 11, color: 'var(--accent-d)' }}>✗ {uploadError}</span>}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={loadFromBackend} disabled={isSyncing}>
                        <RefreshCw size={13} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                        {isSyncing ? 'Загрузка...' : 'Синхр.'}
                    </button>

                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        <Upload size={13} />
                        {isSyncing ? 'Загрузка...' : 'Загрузить XML'}
                        <input
                            type="file" accept=".xml"
                            style={{ display: 'none' }}
                            onChange={handleXMLUpload}
                            disabled={isSyncing}
                        />
                    </label>

                    <button className="btn btn-secondary btn-sm" onClick={exportToPDF}>
                        <Download size={13} /> PDF
                    </button>

                    <div style={{
                        display: 'flex', gap: 2,
                        background: 'var(--surface-0)',
                        border: '1px solid var(--border-0)',
                        padding: 3, borderRadius: 99,
                    }}>
                        {['week', 'month', 'quarter'].map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)} style={{
                                padding: '4px 12px', fontSize: 11, fontWeight: 500,
                                background: viewMode === mode ? 'var(--accent-a)' : 'transparent',
                                color: viewMode === mode ? '#fff' : 'var(--text-1)',
                                border: 'none', borderRadius: 99, cursor: 'pointer',
                                transition: 'all .18s ease',
                            }}>
                                {mode === 'week' ? 'Неделя' : mode === 'month' ? 'Месяц' : 'Квартал'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Таймлайн */}
            <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 500, position: 'relative' }}>
                <div style={{ width: totalWidth, position: 'relative' }}>

                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--border-0)',
                        background: 'rgba(0,0,0,0.45)',
                        position: 'sticky', top: 0, zIndex: 10,
                    }}>
                        <div style={{
                            width: 280, flexShrink: 0, padding: '12px 16px',
                            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
                            color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase',
                            borderRight: '1px solid var(--border-0)', background: 'rgba(0,0,0,0.45)',
                        }}>
                            Группа / Курс
                        </div>
                        <div style={{ display: 'flex' }}>
                            {allDates.map((date, i) => (
                                <div key={i} style={{
                                    width: columnWidth, flexShrink: 0,
                                    padding: '12px 4px', textAlign: 'center',
                                    fontSize: 11, fontWeight: 500, color: 'var(--text-2)',
                                    borderRight: '1px solid var(--border-0)',
                                }}>
                                    {getColumnLabel(date)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {groups.map(group => {
                        const progress   = calcProgress(group)
                        const isConflict = hasConflict(group, groups)
                        const { left, width } = getGroupPosition(group)
                        const courseName = getCourseName(group.courseId, group.courseName)
                        const isEditing  = editingGroup === group.id
                        const isDragging = draggingGroup === group.id
                        const statusColor = group.status === 'active' ? 'var(--accent-b)'
                            : group.status === 'done' ? 'var(--text-1)' : 'var(--accent-c)'
                        const statusLabel = group.status === 'active' ? 'В процессе'
                            : group.status === 'done' ? 'Завершено' : 'Планируется'

                        return (
                            <div key={group.id} style={{
                                display: 'flex',
                                borderBottom: '1px solid var(--border-0)',
                                minHeight: 70, alignItems: 'center',
                                transition: 'background .2s',
                                opacity: isDragging ? 0.6 : 1,
                                background: isDragging ? 'rgba(107,123,255,0.08)'
                                    : isConflict ? 'rgba(255,92,125,0.04)' : 'transparent',
                            }}>
                                <div style={{
                                    width: 280, flexShrink: 0, padding: '12px 16px',
                                    borderRight: '1px solid var(--border-0)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{courseName}</span>
                                        <button onClick={() => startEditing(group)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4 }}>
                                            <Edit2 size={12} />
                                        </button>
                                    </div>

                                    {isEditing ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                            <input type="range" min="0" max="100" value={editProgress}
                                                   onChange={e => setEditProgress(Number(e.target.value))}
                                                   style={{ flex: 1, height: 4 }} />
                                            <span style={{ fontSize: 11, minWidth: 35 }}>{editProgress}%</span>
                                            <button onClick={() => saveProgress(group.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-b)' }}>
                                                <Check size={14} />
                                            </button>
                                            <button onClick={() => setEditingGroup(null)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-d)' }}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                                                {group.participantsCount ?? group.participants?.length ?? 0} участ.
                                                &nbsp;|&nbsp;{group.startDate} — {group.endDate}
                                            </div>
                                            <div style={{ fontSize: 11, marginTop: 3, color: statusColor }}>{statusLabel}</div>
                                            <div className="prog-track" style={{ marginTop: 6 }}>
                                                <div className="prog-fill" style={{
                                                    width: `${progress}%`,
                                                    background: isConflict
                                                        ? 'linear-gradient(90deg,var(--accent-d),#ff8fa3)'
                                                        : 'linear-gradient(90deg,var(--accent-a),var(--accent-b))',
                                                }} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div style={{ position: 'relative', height: 70, flex: 1 }}>
                                    <div style={{ display: 'flex', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                        {allDates.map((_, i) => (
                                            <div key={i} style={{ width: columnWidth, borderRight: '1px solid rgba(255,255,255,0.04)', height: '100%' }} />
                                        ))}
                                    </div>
                                    <div
                                        style={{
                                            position: 'absolute', left, width, top: 15, height: 40,
                                            background: isConflict
                                                ? 'linear-gradient(90deg,var(--accent-d),#ff8fa3)'
                                                : `linear-gradient(90deg,var(--accent-a),${progress > 50 ? 'var(--accent-b)' : 'var(--accent-a)'})`,
                                            borderRadius: 20,
                                            border: isConflict ? '1px solid rgba(255,92,125,0.5)' : '1px solid rgba(255,255,255,0.15)',
                                            overflow: 'hidden',
                                            boxShadow: isConflict ? '0 2px 12px rgba(255,92,125,0.3)' : '0 2px 12px rgba(107,123,255,0.25)',
                                            cursor: isDragging ? 'grabbing' : 'grab',
                                            transition: isDragging ? 'none' : 'all .2s',
                                        }}
                                        title={`${courseName} | ${progress}% | ${group.participantsCount ?? 0} участ.`}
                                        onMouseDown={e => handleDragStart(e, group)}
                                        onClick={e => { e.stopPropagation(); onGroupClick?.(group.id) }}
                                    >
                                        <div style={{
                                            position: 'absolute', left: 0, top: 0, bottom: 0,
                                            width: `${progress}%`, background: 'rgba(255,255,255,0.18)', transition: 'width .3s',
                                        }} />
                                        <div style={{
                                            position: 'relative', padding: '0 12px', height: '100%',
                                            display: 'flex', alignItems: 'center',
                                            fontSize: 11, fontWeight: 500, color: '#fff',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {courseName.length > 20 ? `${courseName.slice(0, 20)}…` : courseName} · {progress}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Итоги */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                gap: 12, padding: '16px 20px',
                borderTop: '1px solid var(--border-0)', background: 'rgba(0,0,0,0.2)',
            }}>
                {[
                    { label: 'Всего групп',  value: groups.length,                                    color: 'var(--text-0)' },
                    { label: 'Активных',      value: groups.filter(g => g.status === 'active').length, color: 'var(--accent-b)' },
                    { label: 'Всего курсов', value: courses.length,                                   color: 'var(--text-0)' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color }}>{value}</div>
                    </div>
                ))}
            </div>

            <div style={{
                padding: '8px 20px', fontSize: 10, color: 'var(--text-2)',
                borderTop: '1px solid var(--border-0)', textAlign: 'center', background: 'rgba(0,0,0,0.15)',
            }}>
                Перетащите полосу для изменения дат · ✏️ для редактирования прогресса
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}