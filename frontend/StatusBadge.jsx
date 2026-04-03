import React from 'react'

const STATUS_CONFIG = {
    planned:  { label: 'Планируется', className: 'badge badge-planned' },
    active:   { label: 'В процессе',  className: 'badge badge-active'  },
    done:     { label: 'Завершено',   className: 'badge badge-done'    },
    paused:   { label: 'Приостановлено', className: 'badge badge-paused' },
}

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
    value, label
}))

export default function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.planned
    return (
        <span className={cfg.className}>
      <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'currentColor', flexShrink: 0,
      }} />
            {cfg.label}
    </span>
    )
}