import React, { useState } from 'react'
import { Plus, Edit2, Trash2, History, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore, getCurrentPrice } from '../store/useStore.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { courseService } from '../services/courseService.js'

const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n))

export default function CoursesPage() {
    const toast = useToast()
    const { courses, groups, setCourses } = useStore()
    const [showModal, setShowModal]       = useState(false)
    const [editTarget, setEditTarget]     = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [historyOpen, setHistoryOpen]   = useState(null)

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
                subtitle={`${courses?.length || 0} курсов в каталоге`}
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
                    {/* 1. Добавили проверку courses?.map на случай если стейт null */}
                    {courses?.map(c => {
                        // 2. ГИБКИЙ МАППИНГ: берем или стандартное имя, или имя из XML (sCourseHL)
                        const name = c.name || c.sCourseHL || 'Без названия'
                        const duration = c.durationDays || c.nDurationInDays || 0
                        const price = getCurrentPrice(c) || c.nPricePerPerson || 0

                        // 3. ЗАЩИТА ОТ ПУСТОЙ ИСТОРИИ: если priceHistory нет, берем пустой массив
                        const pHistory = c.priceHistory || []

                        const groupCount = groups?.filter(g => g.courseId === c.id).length || 0
                        const isHistOpen = historyOpen === c.id

                        return (
                            <React.Fragment key={c.id}>
                                <tr>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{name}</div>
                                        {(c.description || c.sDescription) && (
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                {c.description || c.sDescription}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                        {duration} дн.
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                        {fmt(price)} ₽
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                            <span className="badge" style={{ background: 'var(--glass-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
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
                                            {/* Безопасное обращение к длине массива */}
                                            {pHistory.length} зап.
                                            {isHistOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-icon btn-sm" onClick={() => setEditTarget(c)}>
                                                <Edit2 size={12} />
                                            </button>
                                            <button className="btn btn-icon btn-sm" onClick={() => setDeleteTarget(c)}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {isHistOpen && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: 0 }}>
                                            <div style={{ padding: '12px 20px', background: 'var(--glass-1)', borderTop: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>ИСТОРИЯ ИЗМЕНЕНИЙ</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {pHistory.length > 0 ? (
                                                        [...pHistory].map((h, i) => (
                                                            <div key={i} style={{ fontSize: 12 }}>
                                                                {h.validFrom}: {fmt(h.price)} ₽
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>История цен пуста (данные из импорта)</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                    </tbody>
                </table>

                {(!courses || courses.length === 0) && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        Курсы не найдены. Загрузите XML или создайте вручную.
                    </div>
                )}
            </div>

            {/* Модалки оставляем как были, они работают корректно при наличии защищенных данных */}
        </div>
    )
}