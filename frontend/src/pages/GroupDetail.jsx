import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Edit2, Trash2, Plus, UserMinus,
    AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import {
    useStore, calcGroupProgress, calcGroupCost, getPriceOnDate
} from '../store/useStore.js'
import StatusBadge, { STATUS_OPTIONS } from '../components/ui/StatusBadge.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import GroupModal from '../components/ui/GroupModal.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n))

export default function GroupDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const {
        groups, courses, employees, companies, specifications,
        deleteGroup, updateGroup, addParticipant, removeParticipant, updateParticipantProgress
    } = useStore()

    const [showEdit, setShowEdit] = useState(false)
    const [showDelete, setShowDelete] = useState(false)
    const [showAddParticipant, setShowAddParticipant] = useState(false)
    const [removeTarget, setRemoveTarget] = useState(null)

    const group = groups.find(g => g.id === id)
    if (!group) {
        return (
            <div className="page-enter">
                <div className="empty-state" style={{ marginTop: 80 }}>
                    <div className="empty-state-title">Группа не найдена</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/groups')}
                            style={{ marginTop: 12 }}>
                        Вернуться
                    </button>
                </div>
            </div>
        )
    }

    const course = courses.find(c => c.id === group.courseId)
    const spec = specifications.find(s => s.id === group.specId)
    const progress = calcGroupProgress(group)
    const cost = calcGroupCost(group, course)
    const pricePerPerson = getPriceOnDate(course, group.startDate)

    // Сотрудники, не добавленные в группу
    const availableEmployees = employees.filter(
        e => !group.participants.some(p => p.employeeId === e.id)
    )

    function handleDelete() {
        deleteGroup(id)
        toast('Группа удалена', 'info')
        navigate('/groups')
    }

    return (
        <div className="page-enter">
            {/* Back + Actions */}
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 24,
            }}>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate('/groups')}
                >
                    <ArrowLeft size={13} /> Все группы
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>
                        <Edit2 size={13} /> Редактировать
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>
                        <Trash2 size={13} /> Удалить
                    </button>
                </div>
            </div>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h1 style={{
                        fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em',
                    }}>
                        {course?.name || 'Без курса'}
                    </h1>
                    <StatusBadge status={group.status} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {group.startDate} — {group.endDate}
                    {course && ` · ${course.durationDays} дн.`}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                {/* Participants */}
                <div>
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  Участники группы
                </span>
                                <span style={{
                                    marginLeft: 8, fontSize: 12, color: 'var(--text-tertiary)',
                                }}>
                  {group.participants.length} чел.
                </span>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowAddParticipant(true)}
                                disabled={availableEmployees.length === 0}
                            >
                                <Plus size={13} /> Добавить
                            </button>
                        </div>

                        {group.participants.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                <div className="empty-state-title">Нет участников</div>
                                <div className="empty-state-desc">
                                    Добавьте сотрудников в группу
                                </div>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                <tr>
                                    <th>Сотрудник</th>
                                    <th>Компания</th>
                                    <th style={{ minWidth: 180 }}>Прогресс обучения, %</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {group.participants.map(p => {
                                    const emp = employees.find(e => e.id === p.employeeId)
                                    const company = companies.find(c => c.id === emp?.companyId)
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{emp?.fullName || '—'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                                    {emp?.email}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {company?.name || '—'}
                                            </td>
                                            <td>
                                                {/* Изменение прогресса inline */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div className="progress-bar" style={{ flex: 1 }}>
                                                        <div
                                                            className="progress-bar-fill"
                                                            style={{ width: `${p.progress}%` }}
                                                        />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        min={0} max={100}
                                                        value={p.progress}
                                                        onChange={e =>
                                                            updateParticipantProgress(group.id, p.id, e.target.value)
                                                        }
                                                        style={{ width: 56, textAlign: 'center', padding: '4px 6px' }}
                                                    />
                                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-icon btn-sm"
                                                    onClick={() => setRemoveTarget(p)}
                                                    title="Удалить из группы"
                                                >
                                                    <UserMinus size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right: info card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Cost breakdown
              ЛОГИКА: стоимость группы = цена курса на дату начала × кол-во участников
          */}
                    <div className="glass-card" style={{ padding: 18 }}>
                        <div style={{
                            fontSize: 13, fontWeight: 600, marginBottom: 14, letterSpacing: '-0.02em',
                        }}>
                            Расчёт стоимости
                        </div>
                        {[
                            { label: 'Участников', value: group.participants.length },
                            {
                                label: 'Цена на дату начала',
                                value: `${fmt(pricePerPerson)} ₽`,
                                note: 'фиксируется при создании',
                            },
                            {
                                label: 'Итого за группу',
                                value: `${fmt(cost)} ₽`,
                                bold: true, accent: true,
                            },
                        ].map((row, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '7px 0',
                                borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                                fontSize: 12,
                            }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                    {row.note && (
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {row.note}
                    </span>
                    )}
                </span>
                                <span style={{
                                    fontWeight: row.bold ? 600 : 400,
                                    color: row.accent ? 'var(--accent-blue)' : 'var(--text-primary)',
                                    fontFamily: 'var(--font-mono)',
                                }}>
                  {row.value}
                </span>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    <div className="glass-card" style={{ padding: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                            Средний прогресс
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.04em', marginBottom: 8 }}>
                            {progress}
                            <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>%</span>
                        </div>
                        <div className="progress-bar" style={{ height: 6 }}>
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    {/* Status change */}
                    <div className="glass-card" style={{ padding: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Статус</div>
                        <select
                            className="input"
                            value={group.status}
                            onChange={e => {
                                updateGroup(group.id, { status: e.target.value })
                                toast('Статус обновлён', 'success')
                            }}
                        >
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Spec link */}
                    {spec && (
                        <div className="glass-card" style={{ padding: 18 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Спецификация</div>
                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ width: '100%', justifyContent: 'space-between' }}
                                onClick={() => navigate(`/specifications/${spec.id}`)}
                            >
                                <span>№{spec.number} от {spec.date}</span>
                                <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add participant modal */}
            {showAddParticipant && (
                <div className="modal-overlay" onClick={() => setShowAddParticipant(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Добавить участника</span>
                            <button className="btn btn-icon btn-sm" onClick={() => setShowAddParticipant(false)}>
                                <span style={{ fontSize: 14 }}>✕</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {availableEmployees.length === 0 ? (
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Все сотрудники уже в группе
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {availableEmployees.map(emp => {
                                        const company = companies.find(c => c.id === emp.companyId)
                                        return (
                                            <button
                                                key={emp.id}
                                                className="btn btn-ghost"
                                                style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
                                                onClick={() => {
                                                    addParticipant(group.id, emp.id)
                                                    toast(`${emp.fullName} добавлен`, 'success')
                                                    setShowAddParticipant(false)
                                                }}
                                            >
                                                <div style={{ textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.fullName}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                                                        {company?.name || '—'} · {emp.email}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showEdit && (
                <GroupModal
                    group={group}
                    onClose={() => setShowEdit(false)}
                    onSaved={() => {
                        setShowEdit(false)
                        toast('Группа обновлена', 'success')
                    }}
                />
            )}

            {showDelete && (
                <ConfirmDialog
                    title="Удалить группу?"
                    message={`Группа «${course?.name}» и все привязанные участники будут удалены. Действие необратимо.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDelete(false)}
                />
            )}

            {removeTarget && (
                <ConfirmDialog
                    title="Убрать участника?"
                    message={`${employees.find(e => e.id === removeTarget.employeeId)?.fullName} будет удалён из группы.`}
                    onConfirm={() => {
                        removeParticipant(group.id, removeTarget.id)
                        toast('Участник удалён', 'info')
                        setRemoveTarget(null)
                    }}
                    onCancel={() => setRemoveTarget(null)}
                />
            )}
        </div>
    )
}