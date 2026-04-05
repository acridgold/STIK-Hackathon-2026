import React, { useState } from 'react'
import { Plus, Edit2, Trash2, History, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore, getCurrentPrice } from '../store/useStore.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { courseService } from '../services/courseService.js'

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n))

function CourseModal({ course, onClose, onSaved }) {
    // ✅ Убрали addCourse / updateCourse — теперь используем сервис
    // ✅ Добавили setCourses для обновления стора после ответа бэкенда
    const { setCourses } = useStore()
    const toast = useToast()

    const [form, setForm] = useState({
        name:         course?.name        || '',
        description:  course?.description || '',
        durationDays: course?.durationDays || 1,
        price:        course ? getCurrentPrice(course) : '',
    })
    const [errors, setErrors] = useState({})

    function validate() {
        const e = {}
        if (!form.name.trim()) e.name = 'Введите название'
        if (!form.durationDays || form.durationDays < 1) e.durationDays = 'Минимум 1 день'
        if (!form.price || form.price <= 0) e.price = 'Укажите цену'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    // ✅ Переименовали handleSubmit_NEW → handleSubmit
    // ✅ Теперь кнопка onClick={handleSubmit} работает
    async function handleSubmit() {
        if (!validate()) return

        try {
            if (course) {
                const updated = await courseService.update(course.id, form)
                setCourses(prev => prev.map(c => c.id === updated.id ? updated : c))
            } else {
                const created = await courseService.create(form)
                setCourses(prev => [...prev, created])
            }
            onSaved()
        } catch (err) {
            toast(err.message || 'Ошибка сохранения', 'error')
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">{course ? 'Редактировать курс' : 'Новый курс'}</span>
                    <button className="btn btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Название *</label>
                        <input className="input" value={form.name}
                               onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        {errors.name && <span className="form-error">{errors.name}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Описание</label>
                        <textarea className="input" value={form.description}
                                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Длительность, дней *</label>
                            <input type="number" className="input" min={1} value={form.durationDays}
                                   onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
                            {errors.durationDays && <span className="form-error">{errors.durationDays}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Цена за чел., ₽ *</label>
                            <input type="number" className="input" min={0} value={form.price}
                                   onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                            {errors.price && <span className="form-error">{errors.price}</span>}
                            {course && (
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                    Изменение цены создаёт запись в истории
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Отмена</button>
                    {/* ✅ onClick={handleSubmit} — теперь имя совпадает с функцией выше */}
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                        {course ? 'Сохранить' : 'Создать'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CoursesPage() {
    const toast = useToast()
    // ✅ Убрали deleteCourse из стора — теперь удаление через сервис
    // ✅ Добавили setCourses для обновления стора после удаления
    const { courses, groups, setCourses } = useStore()
    const [showModal, setShowModal]       = useState(false)
    const [editTarget, setEditTarget]     = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [historyOpen, setHistoryOpen]   = useState(null)

    // ✅ Новая функция удаления — идёт на бэкенд, потом обновляет стор
    async function handleDelete() {
        try {
            await courseService.delete(deleteTarget.id)
            setCourses(prev => prev.filter(c => c.id !== deleteTarget.id))
            toast('Курс удалён', 'info')
            setDeleteTarget(null)
        } catch (err) {
            toast(err.message || 'Ошибка удаления', 'error')
        }
    }

    return (
        <div className="page-enter">
            <PageHeader
                title="Курсы обучения"
                subtitle={`${courses.length} курсов в каталоге`}
                actions={
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                        <Plus size={13} /> Новый курс
                    </button>
                }
            />

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                    <thead>
                    <tr>
                        <th>Название курса</th>
                        <th style={{ textAlign: 'center' }}>Длительность</th>
                        <th style={{ textAlign: 'right' }}>Текущая цена</th>
                        <th style={{ textAlign: 'center' }}>Используется в</th>
                        <th>История цен</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {courses.map(c => {
                        const price      = getCurrentPrice(c)
                        const groupCount = groups.filter(g => g.courseId === c.id).length
                        const isHistOpen = historyOpen === c.id

                        return (
                            <React.Fragment key={c.id}>
                                <tr>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                                        {c.description && (
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                {c.description}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                        {c.durationDays} дн.
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                        {fmt(price)} ₽
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge" style={{
                                            background: 'var(--glass-2)',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-secondary)',
                                        }}>
                                            {groupCount} гр.
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ fontSize: 11, gap: 4 }}
                                            onClick={() => setHistoryOpen(isHistOpen ? null : c.id)}
                                        >
                                            <History size={11} />
                                            {c.priceHistory.length} записей
                                            {isHistOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-icon btn-sm"
                                                    onClick={() => setEditTarget(c)}>
                                                <Edit2 size={12} />
                                            </button>
                                            <button className="btn btn-icon btn-sm"
                                                    onClick={() => setDeleteTarget(c)}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {isHistOpen && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: 0 }}>
                                            <div style={{
                                                padding: '12px 20px',
                                                background: 'var(--glass-1)',
                                                borderTop: '1px solid var(--border-subtle)',
                                            }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                                    ИСТОРИЯ ЦЕН — используется для фиксации цены на дату начала группы
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {[...c.priceHistory]
                                                        .sort((a, b) => b.validFrom > a.validFrom ? 1 : -1)
                                                        .map((h, i) => (
                                                            <div key={i} style={{
                                                                display: 'flex', alignItems: 'center', gap: 16,
                                                                fontSize: 12, color: 'var(--text-secondary)',
                                                            }}>
                                                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                                                                    {h.validFrom}
                                                                </span>
                                                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                                                    {fmt(h.price)} ₽
                                                                </span>
                                                                {i === 0 && (
                                                                    <span className="badge" style={{
                                                                        background: 'var(--accent-green-dim)',
                                                                        color: 'var(--accent-green)',
                                                                        border: '1px solid rgba(52,211,153,0.2)',
                                                                    }}>актуальная</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                    {courses.length === 0 && (
                        <tr>
                            <td colSpan={6}>
                                <div className="empty-state">
                                    <div className="empty-state-title">Нет курсов</div>
                                </div>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {(showModal || editTarget) && (
                <CourseModal
                    course={editTarget}
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSaved={() => {
                        setShowModal(false)
                        setEditTarget(null)
                        toast(editTarget ? 'Курс обновлён' : 'Курс создан', 'success')
                    }}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Удалить курс?"
                    message={`Курс «${deleteTarget.name}» будет удалён. Существующие группы сохранятся.`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    )
}
