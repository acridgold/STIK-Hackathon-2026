import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
    const [sidebarWidth, setSidebarWidth] = useState(280)

    return (
        <div style={{
            display: 'flex',
            height: '100%',
            position: 'relative',
            zIndex: 1,
        }}>
            <Sidebar onWidthChange={setSidebarWidth} />
            <main style={{
                flex: 1,
                marginLeft: `${sidebarWidth}px`,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '28px 32px',
                position: 'relative',
                transition: 'margin-left 0.3s ease',
            }} className="main-content-transition">
                <Outlet />
            </main>
        </div>
    )
}