import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useBackendSync } from '../store/useBackendSync.js'

export default function Layout() {
    const { loading, error, reload } = useBackendSync()

    // Пока грузится — показываем спиннер
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'var(--text-secondary)',
                fontSize: 14,
            }}>
                Загрузка данных...
            </div>
        )
    }

    // Если бэкенд недоступен — показываем предупреждение,
    // но НЕ блокируем приложение (стор использует localStorage как fallback)
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {error && (
                    <div style={{
                        padding: '8px 16px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 12,
                        color: 'var(--accent-red)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span>⚠ Бэкенд недоступен — работаем с локальными данными</span>
                        <button
                            onClick={reload}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--accent-red)', cursor: 'pointer',
                                fontSize: 12, textDecoration: 'underline',
                            }}
                        >
                            Повторить
                        </button>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    )
}
