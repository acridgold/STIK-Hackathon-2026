import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useStore, getPriceOnDate } from '../../store/useStore.js'
import { STATUS_OPTIONS } from './StatusBadge.jsx'
import { addDays, format } from 'date-fns'

export default function GroupModal({ group, onClose, onSaved }) {
    const { courses, addGroup, updateGroup } = useStore()

    const [form, setForm] = useState({
        courseId: group?.courseId || '',
        startDate: group?.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: group?.endDate || '',
        status: group?.status || 'planned',
    })
    const [errors, setErrors] = useState({})

    const selectedCourse = courses.find(c => c.id === form.courseId)

    // Автовычисление endDate при смене курса или startDate
    function handleCourseChange(courseId) {
        const course = courses.find(c => c.id === courseId)
        let endDate = form.endDate
        if (course && form.startDate) {
            endDate = format(addDays(new Date(form.startDate), course.durationDays - 1), 'yyyy-MM-dd')
        }
        setForm(f => ({ ...f, courseId, endDate }))
    }

    function handleStartChange(startDate) {
        let endDate = form.endDate
        if (selectedCourse && startDate) {
            endDate = format(addDays(new Date(startDate), selectedCourse.durationDays - 1), 'yyyy-MM-dd')
        }
        setForm(f => ({ ...f, startDate, endDate }))
    }

    function validate() {
        const e = {}
        if (!form.courseId) e.courseId = 'Выберите курс'
        if (!form.startDate) e.startDate = 'Укажите дату начала'
        if (!form.endDate) e.endDate = 'Укажите дату окончания'
        if (form.startDate && form.endDate && form.endDate < form.startDate)
            e.endDate = 'Дата окончания раньше начала'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    function handleSubmit() {
        if (!validate()) return
        if (group) {
            updateGroup(group.id, form)
        } else {
            addGroup(form)
        }
        onSaved()
    }

    const pricePerPerson = selectedCourse
        ? getPriceOnDate(selectedCourse, form.startDate)
        : 0

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
          <span className="modal-title">
            {group ? 'Редактировать группу' : 'Новая учебная группа'}
          </span>
                    <button className="btn btn-icon btn-sm" onClick={onClose}>
                        <X size={14} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Курс обучения *</label>
                        <select
                            className="input"
                            value={form.courseId}
                            onChange={e => handleCourseChange(e.target.value)}
                        >
                            <option value="">— Выберите курс —</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.courseId && <span className="form-error">{errors.courseId}</span>}
                    </div>

                    {selectedCourse && (
                        <div style={{
                            padding: '10px 12px',
                            background: 'var(--accent-blue-dim)',
                            border: '1px solid var(--border-accent)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                        }}>
                            Длительность: {selectedCourse.durationDays} дн. ·
                            Цена на дату начала: <strong style={{ color: 'var(--text-primary)' }}>
                            {new Intl.NumberFormat('ru-RU').format(pricePerPerson)} ₽/чел.
                        </strong>
                        </div>
                    )}

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Дата начала *</label>
                            <input
                                type="date"
                                className="input"
                                value={form.startDate}
                                onChange={e => handleStartChange(e.target.value)}
                            />
                            {errors.startDate && <span className="form-error">{errors.startDate}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Дата окончания *</label>
                            <input
                                type="date"
                                className="input"
                                value={form.endDate}
                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                            />
                            {errors.endDate && <span className="form-error">{errors.endDate}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Статус</label>
                        <select
                            className="input"
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        >
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                        {group ? 'Сохранить' : 'Создать группу'}
                    </button>
                </div>
            </div>
        </div>
    )
}