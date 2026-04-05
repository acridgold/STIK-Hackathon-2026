import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import GroupsPage from './pages/GroupsPage.jsx'
import GroupDetail from './pages/GroupDetail.jsx'
// 1. Импортируем новую страницу
import EmployeesPage from './pages/EmployeesPage.jsx'

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/courses" element={<CoursesPage />} />

                {/* 2. Добавляем маршрут для сотрудников */}
                <Route path="/employees" element={<EmployeesPage />} />

                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/:id" element={<GroupDetail />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}