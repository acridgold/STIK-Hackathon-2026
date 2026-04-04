import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
    const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth <= 768 ? 60 : 280)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    const handleSidebarWidthChange = (width) => {
        setSidebarWidth(width)
    }

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768
            setIsMobile(mobile)
            // Автоматически устанавливаем ширину sidebar при изменении размера
            if (mobile && sidebarWidth > 100) {
                setSidebarWidth(60)
            } else if (!mobile && sidebarWidth < 100) {
                setSidebarWidth(280)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [sidebarWidth])

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
        }}>
            <Sidebar onWidthChange={handleSidebarWidthChange} isMobile={isMobile} />
            <main style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: isMobile ? '16px 12px' : '28px 32px',
                position: 'relative',
                marginLeft: `${sidebarWidth}px`,
                transition: 'margin-left 0.3s ease',
                width: `calc(100% - ${sidebarWidth}px)`,
            }}>
                <Outlet />
            </main>
        </div>
    )
}