'use client'

import { useState } from 'react'

interface DownloadsPanelProps {
  resumeData?: object
  coverLetterData?: object
  companyName?: string
  isLiveMode?: boolean
  liveToken?: string
}

function DocCard({
  title,
  subtitle,
  isLiveMode,
  onDownload,
  downloading,
  buttonLabel,
}: {
  title: string
  subtitle: string
  isLiveMode?: boolean
  onDownload?: () => void
  downloading?: boolean
  buttonLabel: string
}) {
  return (
    <div style={{
      border: '1px solid rgba(240,237,232,0.07)',
      borderRadius: '10px',
      padding: '28px',
      flex: '1',
      minWidth: '240px',
    }}>
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
      {isLiveMode ? (
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            fontSize: '13px',
            fontFamily: 'IBM Plex Mono, monospace',
            color: downloading ? '#8A8784' : '#0F0F0F',
            background: downloading ? 'rgba(200,132,58,0.3)' : '#C8843A',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: downloading ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {downloading ? 'Generating...' : buttonLabel}
        </button>
      ) : (
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
      )}
    </div>
  )
}

export default function DownloadsPanel({
  resumeData,
  coverLetterData,
  companyName,
  isLiveMode,
  liveToken,
}: DownloadsPanelProps) {
  const [downloadingResume, setDownloadingResume] = useState(false)
  const [downloadingCover, setDownloadingCover] = useState(false)

  async function downloadResume() {
    if (!resumeData) return
    setDownloadingResume(true)
    try {
      const res = await fetch('/api/download/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Live-Token': liveToken || '',
        },
        body: JSON.stringify({ resume: resumeData }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sam-manning-resume.docx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingResume(false)
    }
  }

  async function downloadCoverLetter() {
    if (!coverLetterData) return
    setDownloadingCover(true)
    try {
      const res = await fetch('/api/download/coverletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Live-Token': liveToken || '',
        },
        body: JSON.stringify({ coverLetter: coverLetterData, companyName }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sam-manning-cover-letter.docx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingCover(false)
    }
  }

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
        {isLiveMode
          ? 'Download your tailored resume and cover letter as formatted .docx files, ready for submission.'
          : 'In the full Career Engine, this tab generates a one-page tailored resume and cover letter as downloadable .docx files, formatted for ATS systems and human readers.'}
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <DocCard
          title="Tailored Resume"
          subtitle="One-page, ATS-optimized, role-specific"
          isLiveMode={isLiveMode}
          onDownload={downloadResume}
          downloading={downloadingResume}
          buttonLabel="Download Resume .docx"
        />
        <DocCard
          title="Cover Letter"
          subtitle="Three-paragraph, hiring-manager focused"
          isLiveMode={isLiveMode}
          onDownload={downloadCoverLetter}
          downloading={downloadingCover}
          buttonLabel="Download Cover Letter .docx"
        />
      </div>

      {!isLiveMode && (
        <p style={{ fontSize: '14px', color: '#C8843A' }}>
          Want the full version? This tool is available for custom deployment.{' '}
          <a
            href="mailto:sam@tanobuild.com"
            style={{ color: '#D9A05A', textDecoration: 'underline' }}
          >
            sam@tanobuild.com
          </a>
        </p>
      )}
    </div>
  )
}
