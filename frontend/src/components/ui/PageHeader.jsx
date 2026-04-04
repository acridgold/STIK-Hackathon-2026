import React, { useEffect, useState } from 'react'

export default function PageHeader({ title, subtitle, actions }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div style={{
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'flex-start',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            marginBottom: 24,
            gap: 16,
        }}>
            <div>
                <h1 style={{
                    fontSize: isMobile ? 20 : 22,
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                    color: 'var(--text-primary)',
                }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{
                        fontSize: isMobile ? 12 : 13,
                        color: 'var(--text-secondary)',
                        marginTop: 4,
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    alignItems: 'center', 
                    flexShrink: 0,
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'flex-start' : 'flex-end',
                }}>
                    {actions}
                </div>
            )}
        </div>
    )
}