'use client'

import { useState, useRef, useEffect } from 'react'
import OutputPanel from '@/components/output/OutputPanel'
import { DEMO_JOB_POSTING, DEMO_OUTPUT } from '@/lib/demoContent'

type LoadingPhase = null | 'analyzing' | 'building'

export default function Home() {
  const [jobPosting, setJobPosting] = useState(DEMO_JOB_POSTING)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null)
  const [result, setResult] = useState<typeof DEMO_OUTPUT | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  async function handleGenerate() {
    if (!jobPosting.trim() || loading) return
    setLoading(true)
    setLoadingPhase('analyzing')
    setResult(null)

    // Phase 1: "Analyzing role fit..." for 1.4s
    await new Promise(resolve => setTimeout(resolve, 1400))
    setLoadingPhase('building')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobPosting }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const data = await res.json()
      setResult(data.data)
    } catch {
      // silently fail in demo
    } finally {
      setLoading(false)
      setLoadingPhase(null)
    }
  }

  // Smooth scroll to output when result appears
  useEffect(() => {
    if (result && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.1em',
          color: '#4A4846',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Career Engine
        </div>
        <h1 style={{
          fontFamily: 'DM Serif Display, Georgia, serif',
          fontSize: 'clamp(28px, 4vw, 40px)',
          color: '#F0EDE8',
          letterSpacing: '-0.01em',
          marginBottom: '12px',
          fontWeight: 400,
        }}>
          Your tailored career package
        </h1>
        <p style={{
          fontSize: '15px',
          color: '#8A8784',
          lineHeight: '1.6',
          maxWidth: '520px',
        }}>
          Paste a job posting below. The engine analyzes role fit, generates
          interview talking points, and builds a salary negotiation brief.
        </p>
      </div>

      {/* Input section */}
      <div style={{ marginBottom: '48px' }}>
        <label style={{
          display: 'block',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: '#4A4846',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Job posting
        </label>
        <textarea
          value={jobPosting}
          onChange={(e) => setJobPosting(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            minHeight: '280px',
            background: '#1A1A1A',
            border: '1px solid rgba(240,237,232,0.07)',
            borderRadius: '10px',
            padding: '20px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#F0EDE8',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(200,132,58,0.4)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(240,237,232,0.07)'
          }}
        />

        <button
          onClick={handleGenerate}
          disabled={loading || !jobPosting.trim()}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '16px 24px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '14px',
            letterSpacing: '0.02em',
            color: loading ? '#C8843A' : '#FFFFFF',
            background: loading ? 'rgba(200,132,58,0.1)' : '#C8843A',
            border: loading ? '1px solid rgba(200,132,58,0.3)' : '1px solid #C8843A',
            borderRadius: '10px',
            cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.2s',
            opacity: !jobPosting.trim() && !loading ? 0.4 : 1,
          }}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <LoadingDots />
              {loadingPhase === 'analyzing' ? 'Analyzing role fit...' : 'Building your package...'}
            </span>
          ) : (
            'Generate career package \u2192'
          )}
        </button>
      </div>

      {/* Output */}
      {result && (
        <div ref={outputRef} style={{ paddingTop: '16px' }}>
          <OutputPanel data={result} />
        </div>
      )}
    </main>
  )
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '3px' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#C8843A',
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  )
}
