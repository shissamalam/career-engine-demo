'use client'

interface TalkingPoint {
  question: string
  approach: string
  keyMessage: string
}

export default function TalkingPointsPanel({ points }: { points: TalkingPoint[] }) {
  if (!points || points.length === 0) {
    return (
      <div style={{ padding: '40px 0', fontSize: '14px', color: '#4A4846', fontFamily: 'IBM Plex Mono, monospace' }}>
        No talking points available.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {points.map((point, i) => (
        <div key={i}>
          <div style={{ position: 'relative', padding: '32px 0' }}>
            {/* Decorative number */}
            <div style={{
              position: 'absolute',
              top: '28px',
              right: '0',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '48px',
              fontWeight: '500',
              color: 'rgba(255,255,255,0.04)',
              lineHeight: '1',
              userSelect: 'none',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>

            {/* Question */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', paddingRight: '60px' }}>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                color: '#C8843A',
                letterSpacing: '0.06em',
                marginTop: '5px',
                flexShrink: 0,
              }}>
                Q
              </span>
              <span style={{
                fontFamily: 'DM Serif Display, Georgia, serif',
                fontSize: '17px',
                fontWeight: '400',
                color: '#F0EDE8',
                lineHeight: '1.4',
                fontStyle: 'italic',
              }}>
                {point.question}
              </span>
            </div>

            {/* Approach */}
            <div style={{ paddingLeft: '24px' }}>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: '#4A4846',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                Your approach
              </div>
              <p style={{ fontSize: '14px', color: '#8A8784', lineHeight: '1.7', marginBottom: '16px' }}>
                {point.approach}
              </p>

              {/* Key message callout */}
              <div style={{
                background: 'rgba(200,132,58,0.08)',
                borderLeft: '3px solid #C8843A',
                padding: '14px 18px',
                borderRadius: '0 6px 6px 0',
              }}>
                <span style={{ color: '#C8843A', marginRight: '8px' }}>→</span>
                <span style={{ fontSize: '14px', color: '#D9A05A', lineHeight: '1.6' }}>
                  {point.keyMessage}
                </span>
              </div>
            </div>
          </div>

          {/* Divider (not after last) */}
          {i < points.length - 1 && (
            <div style={{ borderTop: '1px solid rgba(240,237,232,0.07)' }} />
          )}
        </div>
      ))}
    </div>
  )
}
