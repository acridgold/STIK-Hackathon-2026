import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, BookOpen, Users, Settings,
    GraduationCap, Building2, ChevronLeft, ChevronRight
} from 'lucide-react'

const navigation = [
    { name: 'Дашборд', href: '/', icon: LayoutDashboard },
    { name: 'Курсы', href: '/courses', icon: BookOpen },
    { name: 'Группы', href: '/groups', icon: GraduationCap },
    { name: 'Сотрудники', href: '/employees', icon: Users },
    { name: 'Компании', href: '/companies', icon: Building2 },
    { name: 'Настройки', href: '/settings', icon: Settings },
]

export default function Sidebar({ onWidthChange }) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
        onWidthChange?.(isCollapsed ? 72 : 280)
    }, [isCollapsed, onWidthChange])

    const handleToggle = () => {
        setIsCollapsed(!isCollapsed)
    }

    return (
        <aside style={{
            width: isCollapsed ? '72px' : '280px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px 0',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            zIndex: 10,
            transition: 'width 0.3s ease',
            overflow: 'hidden',
        }} className="sidebar-transition">
            {/* Logo */}
            <div style={{
                padding: '0 24px 32px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '24px',
                position: 'relative',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: isCollapsed ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #4da6ff 0%, #34d399 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: 'white',
                        flexShrink: 0,
                    }}>
                        S
                    </div>
                    <div style={{
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                    }}>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'white',
                            letterSpacing: '-0.02em',
                        }}>
                            STIK ERP
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginTop: '2px',
                        }}>
                            Корпоративное обучение
                        </div>
                    </div>
                </div>

                {/* Collapse Button */}
                <button
                    onClick={handleToggle}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        zIndex: 20,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                        e.currentTarget.style.borderColor = 'rgba(77, 166, 255, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    }}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <nav style={{ padding: '0 16px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {navigation.map((item) => (
                        <li key={item.name} style={{ marginBottom: '4px' }}>
                            <NavLink
                                to={item.href}
                                title={isCollapsed ? item.name : ''}
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                    background: isActive ? 'rgba(77, 166, 255, 0.2)' : 'transparent',
                                    border: isActive ? '1px solid rgba(77, 166, 255, 0.3)' : '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    minWidth: isCollapsed ? '40px' : 'auto',
                                })}
                                onMouseEnter={(e) => {
                                    if (!e.currentTarget.classList.contains('active')) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!e.currentTarget.classList.contains('active')) {
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                }}
                            >
                                <item.icon size={isCollapsed ? 9 : 18} />
                                {!isCollapsed && (
                                    <span style={{
                                        opacity: isCollapsed ? 0 : 1,
                                        transition: 'opacity 0.3s ease',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                    }}>
                                        {item.name}
                                    </span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '16px',
                right: '16px',
                opacity: isCollapsed ? 0 : 1,
                transition: 'opacity 0.3s ease',
            }}>
                <div style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                    <div style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textAlign: 'center',
                        lineHeight: '1.4',
                    }}>
                        STIK ERP v1.0.0
                        <br />
                        2026 © Все права защищены
                    </div>
                </div>
            </div>
        </aside>
    )
}
