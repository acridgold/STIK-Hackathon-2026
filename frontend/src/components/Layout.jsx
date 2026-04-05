import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useBackendSync } from '../store/useBackendSync.js'

export default function Layout() {
    const { loading, error, reload } = useBackendSync()

    // ЛОГИКА МАСШТАБИРОВАНИЯ ИЗ ТВОЕГО КОДА
    const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth <= 768 ? 60 : 280)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    const handleSidebarWidthChange = (width) => {
        setSidebarWidth(width)
    }

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768
            setIsMobile(mobile)
            if (mobile && sidebarWidth > 100) {
                setSidebarWidth(60)
            } else if (!mobile && sidebarWidth < 100) {
                setSidebarWidth(280)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [sidebarWidth])

    // Состояние загрузки
    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: '#0f0f0f', color: 'var(--text-secondary)', fontSize: 14
            }}>
                Загрузка данных...
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100vw',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            background: '#0f0f0f'
        }}>
            {/* САЙДБАР */}
            <Sidebar onWidthChange={handleSidebarWidthChange} isMobile={isMobile} />

            {/* ГЛАВНЫЙ КОНТЕНТ С ТВОИМ МАСШТАБИРОВАНИЕМ */}
            <main style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: isMobile ? '16px 12px' : '28px 32px',
                position: 'relative',
                marginLeft: `${sidebarWidth}px`, // Ключевой фикс наложения
                transition: 'margin-left 0.3s ease, width 0.3s ease',
                width: `calc(100% - ${sidebarWidth}px)`,
                display: 'flex',
                flexDirection: 'column'
            }}>

                {/* ПЛАШКА ОШИБКИ: Центрируется строго в области контента */}
                {error && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        // Считаем центр области main: отступ сайдбара + половина оставшейся ширины
                        left: `calc(${sidebarWidth}px + (100% - ${sidebarWidth}px) / 2)`,
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        padding: '12px 20px',
                        background: 'rgba(28, 28, 28, 0.95)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backdropFilter: 'blur(10px)',
                        minWidth: isMobile ? '90%' : '400px',
                        transition: 'all 0.3s ease'
                    }}>
                        <span style={{ color: '#ef4444' }}>⚠</span>
                        <div style={{ flexGrow: 1 }}>
                            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Бэкенд недоступен</div>
                            <div style={{ color: '#9ca3af', fontSize: '11px' }}>Данные сохранены локально</div>
                        </div>
                        <button
                            onClick={reload}
                            style={{
                                background: '#ef4444', color: '#fff', border: 'none',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '11px',
                                fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ПОВТОРИТЬ
                        </button>
                    </div>
                )}

                <Outlet />
            </main>
        </div>
    )
}