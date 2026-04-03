import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal"
                style={{ maxWidth: 400 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {danger && <AlertTriangle size={18} color="var(--accent-red)" />}
                        <span className="modal-title">{title}</span>
                    </div>
                    <button className="btn btn-icon btn-sm" onClick={onCancel}>
                        <X size={14} />
                    </button>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {message}
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost btn-sm" onClick={onCancel}>
                        Отмена
                    </button>
                    <button
                        className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                    >
                        Подтвердить
                    </button>
                </div>
            </div>
        </div>
    )
}