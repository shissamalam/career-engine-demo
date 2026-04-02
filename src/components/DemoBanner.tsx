'use client'
import { useState } from 'react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{
      background: 'rgba(200, 132, 58, 0.1)',
      borderBottom: '1px solid rgba(200, 132, 58, 0.25)',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontSize: '13px',
      color: '#C8843A',
      position: 'relative',
      zIndex: 100,
    }}>
      <span>
        <strong>Demo mode</strong> — pre-filled with a fictional
        candidate and job posting. All output is pre-generated.
        No data is stored or submitted.
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none', border: 'none', color: '#C8843A',
          cursor: 'pointer', fontSize: '18px', lineHeight: 1,
          padding: '0 4px', opacity: 0.5,
        }}
      >×</button>
    </div>
  )
}
