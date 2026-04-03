import React from 'react'

export default function PageHeader({ title, subtitle, actions }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
        }}>
            <div>
                <h1 style={{
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                    color: 'var(--text-primary)',
                }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        marginTop: 4,
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {actions}
                </div>
            )}
        </div>
    )
}