'use client'

interface SalaryData {
  postedRange: string
  marketContext: string
  recommendation: string
  negotiationNotes: string[]
  redFlags: string[]
}

export default function SalaryPanel({ data }: { data: SalaryData }) {
  return (
    <div>
      {/* Range block */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#4A4846',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Posted compensation
        </div>
        <div style={{
          fontFamily: 'DM Serif Display, Georgia, serif',
          fontSize: 'clamp(22px, 3vw, 32px)',
          color: '#F0EDE8',
          letterSpacing: '-0.01em',
        }}>
          {data.postedRange}
        </div>
      </div>

      {/* Market context */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#4A4846',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Market context
        </div>
        <p style={{ fontSize: '15px', color: '#8A8784', lineHeight: '1.7' }}>
          {data.marketContext}
        </p>
      </div>

      {/* Recommendation */}
      <div style={{
        background: '#242424',
        borderRadius: '10px',
        padding: '24px',
        marginBottom: '36px',
      }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#C8843A',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Recommendation
        </div>
        <p style={{ fontSize: '15px', color: '#F0EDE8', lineHeight: '1.7' }}>
          {data.recommendation}
        </p>
      </div>

      {/* Negotiation notes */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#4A4846',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Negotiation notes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.negotiationNotes.map((note, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px' }}>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '13px',
                color: '#C8843A',
                flexShrink: 0,
                width: '24px',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p style={{ fontSize: '14px', color: '#8A8784', lineHeight: '1.6' }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Red flags */}
      {data.redFlags.length > 0 && (
        <div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: '#f87171',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            Red flags to watch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.redFlags.map((flag, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#f87171',
                  flexShrink: 0,
                  marginTop: '7px',
                }} />
                <p style={{ fontSize: '14px', color: '#a78b7a', lineHeight: '1.6' }}>
                  {flag}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
