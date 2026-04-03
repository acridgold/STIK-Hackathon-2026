import React from 'react'
import { Calendar, AlertCircle } from 'lucide-react'

/**
 * GanttChart Component - Placeholder
 * 
 * Диаграмма Ганта для визуализации расписания учебных групп
 * 
 * - Отображение временной шкалы (месяцы/квартали)
 * - Визуализацию курсов по временным интервалам
 * - Обработку конфликтов расписания
 * - Интерактивность (клик на группу для перехода в детали)
 * - Адаптивность для мобильных устройств
 * - Экспорт в PDF
 * 
 * Props:
 * - groups: Array - список учебных групп
 * - courses: Array - список курсов
 */

export default function GanttChart({ groups = [], courses = [] }) {
    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color="var(--accent-blue)" />
                    <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>
                        Диаграмма Ганта
                    </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    {groups.length} групп
                </span>
            </div>

            <div style={{
                padding: '32px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '300px',
                background: 'rgba(255, 255, 255, 0.02)',
            }}>
                <div style={{
                    padding: '16px',
                    background: 'rgba(77, 166, 255, 0.1)',
                    border: '1px solid rgba(77, 166, 255, 0.2)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    maxWidth: '400px',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, marginBottom: 8,
                    }}>
                        <AlertCircle size={18} color="var(--accent-blue)" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                            Компонент в разработке
                        </span>
                    </div>
                    <p style={{
                        fontSize: 12, color: 'var(--text-secondary)', margin: 0,
                        lineHeight: '1.6',
                    }}>
                        Интерактивная диаграмма Ганта для отображения расписания курсов будет доступна в следующей версии.
                    </p>
                </div>

                <div style={{
                    marginTop: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    width: '100%',
                }}>
                    {[
                        { label: 'Временная шкала', value: 'Q2-Q3 2026' },
                        { label: 'Видимо групп', value: groups.length },
                        { label: 'Курсов в плане', value: courses.length },
                    ].map((item, i) => (
                        <div key={i} style={{
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

