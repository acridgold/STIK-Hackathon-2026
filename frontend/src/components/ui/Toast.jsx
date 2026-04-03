import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const toast = useCallback((message, type = 'info') => {
        const id = crypto.randomUUID()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3500)
    }, [])

    const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

    const icons = {
        success: <CheckCircle size={15} />,
        error: <XCircle size={15} />,
        warning: <AlertTriangle size={15} />,
        info: <Info size={15} />,
    }

    const colors = {
        success: 'var(--accent-green)',
        error: 'var(--accent-red)',
        warning: 'var(--accent-amber)',
        info: 'var(--accent-blue)',
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <span style={{ color: colors[t.type] }}>{icons[t.type]}</span>
                        <span style={{ flex: 1 }}>{t.message}</span>
                        <button
                            onClick={() => dismiss(t.id)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-tertiary)', padding: 0, lineHeight: 1,
                                display: 'flex', alignItems: 'center'
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)