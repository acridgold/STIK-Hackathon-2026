import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
    const [sidebarWidth, setSidebarWidth] = useState(280)

    const handleSidebarWidthChange = (width) => {
        setSidebarWidth(width)
    }

    return (
        <div style={{
            display: 'flex',
            height: '100%',
            position: 'relative',
            zIndex: 1,
        }}>
            <Sidebar onWidthChange={handleSidebarWidthChange} />
            <main style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '28px 32px',
                position: 'relative',
                marginLeft: `${sidebarWidth}px`,
            }}>
                <Outlet />
            </main>
        </div>
    )
}