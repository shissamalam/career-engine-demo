'use client'

interface Strength {
  title: string
  detail: string
}

interface Gap {
  title: string
  detail: string
  severity: 'minor' | 'significant'
}

interface RoleFitData {
  score: number
  scoreLabel: string
  summary: string
  strengths: Strength[]
  gaps: Gap[]
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 90 ? '#4ade80' : score >= 75 ? '#fbbf24' : score >= 60 ? '#fb923c' : '#f87171'
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx="64" cy="64" r="54" fill="none"
        stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text x="64" y="58" textAnchor="middle" fill={color} fontSize="36" fontWeight="600" fontFamily="IBM Plex Mono, monospace">
        {score}
      </text>
      <text x="64" y="78" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="IBM Plex Mono, monospace">
        / 100
      </text>
    </svg>
  )
}

export default function RoleFitPanel({ data }: { data: RoleFitData }) {
  return (
    <div>
      {/* Score block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '40px' }}>
        <ScoreCircle score={data.score} />
        <div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: data.score >= 90 ? '#4ade80' : '#fbbf24',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            {data.scoreLabel}
          </div>
          <p style={{ fontSize: '15px', color: '#8A8784', lineHeight: '1.7', maxWidth: '520px' }}>
            {data.summary}
          </p>
        </div>
      </div>

      {/* Strengths */}
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '11px',
        letterSpacing: '0.1em',
        color: '#4ade80',
        textTransform: 'uppercase',
        marginBottom: '20px',
      }}>
        Why this works
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px' }}>
        {data.strengths.map((s, i) => (
          <div key={i} style={{ borderLeft: '2px solid rgba(74,222,128,0.4)', paddingLeft: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#F0EDE8', marginBottom: '6px' }}>
              {s.title}
            </div>
            <p style={{ fontSize: '14px', color: '#8A8784', lineHeight: '1.7' }}>
              {s.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Gaps */}
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '11px',
        letterSpacing: '0.1em',
        color: '#fbbf24',
        textTransform: 'uppercase',
        marginBottom: '20px',
      }}>
        Areas to address
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {data.gaps.map((g, i) => (
          <div key={i} style={{ borderLeft: `2px solid ${g.severity === 'significant' ? 'rgba(248,113,113,0.4)' : 'rgba(251,191,36,0.4)'}`, paddingLeft: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: '500', color: '#F0EDE8' }}>
                {g.title}
              </span>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: g.severity === 'significant' ? '#f87171' : '#fbbf24',
                background: g.severity === 'significant' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                padding: '2px 8px',
                borderRadius: '3px',
              }}>
                {g.severity.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#C8843A', marginBottom: '4px', fontStyle: 'italic' }}>
              How to frame this →
            </div>
            <p style={{ fontSize: '14px', color: '#8A8784', lineHeight: '1.7' }}>
              {g.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
