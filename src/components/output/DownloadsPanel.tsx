'use client'

function DocCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      border: '1px solid rgba(240,237,232,0.07)',
      borderRadius: '10px',
      padding: '28px',
      flex: '1',
      minWidth: '240px',
    }}>
      {/* Icon */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '16px' }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#4A4846" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14,2 14,8 20,8" stroke="#4A4846" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="8" y1="13" x2="16" y2="13" stroke="#4A4846" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="8" y1="17" x2="13" y2="17" stroke="#4A4846" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: '15px', fontWeight: '500', color: '#F0EDE8', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: '#8A8784', marginBottom: '20px' }}>
        {subtitle}
      </div>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          disabled
          style={{
            fontSize: '13px',
            fontFamily: 'IBM Plex Mono, monospace',
            color: '#4A4846',
            background: '#1A1A1A',
            border: '1px solid rgba(240,237,232,0.07)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'not-allowed',
          }}
          title="Available in full version"
        >
          Download .docx
        </button>
      </div>
    </div>
  )
}

export default function DownloadsPanel() {
  return (
    <div>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        letterSpacing: '0.1em',
        color: '#4A4846',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}>
        Documents
      </div>
      <p style={{ fontSize: '14px', color: '#8A8784', lineHeight: '1.6', marginBottom: '28px', maxWidth: '560px' }}>
        In the full Career Engine, this tab generates a one-page tailored
        resume and cover letter as downloadable .docx files, formatted for
        ATS systems and human readers.
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <DocCard
          title="Tailored Resume"
          subtitle="One-page, ATS-optimized, role-specific"
        />
        <DocCard
          title="Cover Letter"
          subtitle="Three-paragraph, hiring-manager focused"
        />
      </div>

      <p style={{ fontSize: '14px', color: '#C8843A' }}>
        Want the full version? This tool is available for custom deployment.{' '}
        <a
          href="mailto:sam@tanobuild.com"
          style={{ color: '#D9A05A', textDecoration: 'underline' }}
        >
          sam@tanobuild.com
        </a>
      </p>
    </div>
  )
}
