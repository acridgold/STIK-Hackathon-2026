import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useBackendSync } from '../store/useBackendSync';
import { UserPlus, RefreshCw, Mail, Building, Search, X } from 'lucide-react';

export default function EmployeesPage() {
    // 1. Синхронизация и данные
    const { loading, reload } = useBackendSync({ employees: true, companies: true });
    const employees = useStore((state) => state.employees);
    const companies = useStore((state) => state.companies);
    const addEmployee = useStore((state) => state.addEmployee);

    // 2. Состояние
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ fullName: '', email: '', companyId: '' });

    // Фильтрация
    const filteredEmployees = employees.filter(emp =>
        emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addEmployee({ ...formData, id: Date.now().toString() });
        setIsModalOpen(false);
        setFormData({ fullName: '', email: '', companyId: '' });
        await reload();
    };

    return (
        <div className="page-enter" style={{ padding: 'var(--space-6)', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-primary" style={{ fontSize: '24px', marginBottom: '4px' }}>Участники обучения</h1>
                    <p className="text-secondary">Управление базой сотрудников и их принадлежностью к организациям</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={() => reload()} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="hide-on-mobile">Обновить</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <UserPlus size={16} />
                        <span>Добавить</span>
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="glass-card-sm mb-6" style={{ padding: 'var(--space-3)' }}>
                <div className="flex items-center gap-3">
                    <Search size={18} className="text-dim" />
                    <input
                        type="text"
                        className="input"
                        style={{ border: 'none', background: 'transparent' }}
                        placeholder="Поиск по ФИО или Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-wrap glass-card">
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th>ФИО Сотрудника</th>
                            <th>Организация</th>
                            <th>Контактные данные</th>
                            <th style={{ textAlign: 'right' }}>Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredEmployees.map((emp) => {
                            const company = companies.find(c => String(c.id) === String(emp.companyId));
                            return (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="stat-dot" style={{ margin: 0 }}></div>
                                            <span className="text-primary" style={{ fontWeight: 500 }}>{emp.fullName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {company ? (
                                            <span className="badge badge-blue">
                                                    <Building size={12} /> {company.name}
                                                </span>
                                        ) : (
                                            <span className="text-dim">Не привязан</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-secondary">
                                            <Mail size={14} />
                                            <span className="mono">{emp.email || '—'}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn btn-ghost btn-sm text-dim">Изменить</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredEmployees.length === 0 && (
                            <tr>
                                <td colSpan="4">
                                    <div className="empty-state">
                                        <div className="empty-icon"><Search /></div>
                                        <div className="empty-title">Сотрудники не найдены</div>
                                        <div className="empty-desc">Попробуйте изменить запрос или добавьте нового сотрудника</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Новый участник</h2>
                            <button className="btn btn-icon" onClick={() => setIsModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Полное имя</label>
                                    <input
                                        className="input"
                                        required
                                        placeholder="Иванов Иван Иванович"
                                        value={formData.fullName}
                                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        className="input"
                                        type="email"
                                        placeholder="ivanov@company.ru"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Организация</label>
                                    <select
                                        className="select"
                                        value={formData.companyId}
                                        onChange={e => setFormData({...formData, companyId: e.target.value})}
                                    >
                                        <option value="">Выберите из списка...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Отмена</button>
                                <button type="submit" className="btn btn-primary">Создать профиль</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}