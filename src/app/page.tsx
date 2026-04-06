'use client'

import { useState, useRef, useEffect } from 'react'
import OutputPanel from '@/components/output/OutputPanel'
import DemoBanner from '@/components/DemoBanner'
import { DEMO_JOB_POSTING, DEMO_OUTPUT } from '@/lib/demoContent'

type LoadingPhase = null | 'analyzing' | 'building'

export default function Home() {
  const [jobPosting, setJobPosting] = useState(DEMO_JOB_POSTING)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null)
  const [result, setResult] = useState<typeof DEMO_OUTPUT | null>(null)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [unlockInput, setUnlockInput] = useState('')
  const [unlockError, setUnlockError] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  function handleUnlock() {
    // Hash check happens server-side via the token
    // Client just sends the password and checks if API accepts it
    if (unlockInput.trim()) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('career_live_token', unlockInput.trim())
      }
      setIsLiveMode(true)
      setShowUnlock(false)
      setUnlockInput('')
      setUnlockError(false)
      // Clear the pre-filled job posting so Sam can enter a real one
      setJobPosting('')
    } else {
      setUnlockError(true)
    }
  }

  async function handleGenerate() {
    if (!jobPosting.trim() || loading) return
    setLoading(true)
    setLoadingPhase('analyzing')
    setResult(null)

    await new Promise(resolve => setTimeout(resolve, 1400))
    setLoadingPhase('building')

    try {
      const token = typeof window !== 'undefined'
        ? sessionStorage.getItem('career_live_token')
        : null
      const endpoint = isLiveMode ? '/api/generate-live' : '/api/generate'
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (isLiveMode && token) {
        headers['X-Live-Token'] = token
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobPosting }),
      })

      if (!res.ok) {
        // If unauthorized, drop back to demo mode
        if (res.status === 401) {
          setIsLiveMode(false)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('career_live_token')
          }
          setUnlockError(true)
          setShowUnlock(true)
        }
        throw new Error('Generation failed')
      }

      const data = await res.json()
      setResult(data.data)
    } catch {
      // silently fail
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
    <>
      {/* Mode banner */}
      {isLiveMode ? (
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          fontSize: '13px',
          color: '#4ade80',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#4ade80', display: 'inline-block',
            flexShrink: 0,
          }} />
          LIVE MODE — real API calls · your DNA prompt active
          <button
            onClick={() => {
              setIsLiveMode(false)
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('career_live_token')
              }
              setJobPosting(DEMO_JOB_POSTING)
            }}
            style={{
              background: 'none', border: 'none',
              color: '#4ade80', cursor: 'pointer',
              fontSize: '11px', opacity: 0.6,
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            exit live mode
          </button>
        </div>
      ) : (
        <DemoBanner />
      )}

      {/* Unlock modal */}
      {showUnlock && (
        <div
          onClick={() => setShowUnlock(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '12px',
              padding: '32px',
              width: '340px',
            }}
          >
            <div style={{
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              color: '#C8843A',
              letterSpacing: '0.1em',
              marginBottom: '16px',
            }}>
              UNLOCK LIVE MODE
            </div>
            <input
              type="password"
              value={unlockInput}
              onChange={e => {
                setUnlockInput(e.target.value)
                setUnlockError(false)
              }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter private password"
              autoFocus
              style={{
                width: '100%',
                background: '#0F0F0F',
                border: `1px solid ${unlockError ? '#ef4444' : '#2A2A2A'}`,
                borderRadius: '8px',
                padding: '12px',
                color: '#F0EDE8',
                fontSize: '14px',
                marginBottom: '12px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {unlockError && (
              <div style={{
                fontSize: '12px', color: '#ef4444',
                marginBottom: '12px',
                fontFamily: 'IBM Plex Mono, monospace',
              }}>
                incorrect password
              </div>
            )}
            <button
              onClick={handleUnlock}
              style={{
                width: '100%',
                background: '#C8843A',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                color: '#0F0F0F',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Unlock
            </button>
          </div>
        </div>
      )}

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

          {!isLiveMode && (
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                onClick={() => setShowUnlock(true)}
                style={{
                  background: 'none', border: 'none',
                  color: '#4A4846', cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  letterSpacing: '0.06em',
                }}
              >
                unlock live mode
              </button>
            </div>
          )}
        </div>

        {/* Output */}
        {result && (
          <div ref={outputRef} style={{ paddingTop: '16px' }}>
            <OutputPanel data={result} />
          </div>
        )}
      </main>
    </>
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
