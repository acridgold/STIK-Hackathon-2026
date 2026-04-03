import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
    return (
        <div style={{
            display: 'flex',
            height: '100%',
            position: 'relative',
            zIndex: 1,
        }}>
            <Sidebar />
            <main style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '28px 32px',
                position: 'relative',
            }}>
                <Outlet />
            </main>
        </div>
    )
}