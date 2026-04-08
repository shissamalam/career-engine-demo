'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Job {
  id: number
  title: string
  company: string
  location: string | null
  salary_display: string | null
  url: string
  fit_score: number
  fit_label: string
  fit_summary: string
  date_found: string
  status: string
  description: string
}

export default function JobsPage() {
  const [token, setToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const stored = sessionStorage.getItem('career_live_token')
    if (stored) {
      setToken(stored)
      setAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (authenticated && token) fetchJobs()
  }, [authenticated, token])

  async function handleAuth() {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        headers: { 'X-Live-Token': tokenInput }
      })
      if (res.status === 401) {
        setError('Incorrect password')
        setLoading(false)
        return
      }
      const data = await res.json()
      sessionStorage.setItem('career_live_token', tokenInput)
      setToken(tokenInput)
      setJobs(data.jobs || [])
      setAuthenticated(true)
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function fetchJobs() {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        headers: { 'X-Live-Token': token }
      })
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch {
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: number, status: string) {
    await fetch('/api/jobs', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Live-Token': token,
      },
      body: JSON.stringify({ id, status }),
    })
    setJobs(jobs.map(j => j.id === id ? { ...j, status } : j))
  }

  function analyze(job: Job) {
    sessionStorage.setItem('career_prefill_job', job.description)
    sessionStorage.setItem('career_prefill_title', `${job.title} at ${job.company}`)
    router.push('/')
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0F0F0F',
    color: '#F0EDE8',
    fontFamily: 'system-ui, sans-serif',
    padding: '0',
  }

  const headerStyle: React.CSSProperties = {
    borderBottom: '1px solid rgba(240,237,232,0.07)',
    padding: '20px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 24px',
  }

  const cardStyle = (status: string): React.CSSProperties => ({
    background: status === 'applied' ? 'rgba(74,222,128,0.05)'
      : status === 'passed' ? 'rgba(255,255,255,0.02)'
      : '#1A1A1A',
    border: `1px solid ${
      status === 'applied' ? 'rgba(74,222,128,0.2)'
      : status === 'passed' ? 'rgba(240,237,232,0.04)'
      : 'rgba(240,237,232,0.08)'
    }`,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    opacity: status === 'passed' ? 0.5 : 1,
  })

  const scoreColor = (score: number) =>
    score >= 95 ? '#4ade80'
    : score >= 90 ? '#C8843A'
    : '#8A8784'

  if (!authenticated) {
    return (
      <div style={pageStyle}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#1A1A1A',
            border: '1px solid rgba(240,237,232,0.08)',
            borderRadius: '12px',
            padding: '40px',
            width: '340px',
          }}>
            <div style={{
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              color: '#C8843A',
              letterSpacing: '0.1em',
              marginBottom: '24px',
            }}>
              JOB LEADS
            </div>
            <input
              type="password"
              value={tokenInput}
              onChange={e => {
                setTokenInput(e.target.value)
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="Enter password"
              autoFocus
              style={{
                width: '100%',
                background: '#0F0F0F',
                border: `1px solid ${error ? '#ef4444' : 'rgba(240,237,232,0.1)'}`,
                borderRadius: '8px',
                padding: '12px',
                color: '#F0EDE8',
                fontSize: '14px',
                marginBottom: '8px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {error && (
              <div style={{
                fontSize: '12px',
                color: '#ef4444',
                marginBottom: '12px',
                fontFamily: 'IBM Plex Mono, monospace',
              }}>
                {error}
              </div>
            )}
            <button
              onClick={handleAuth}
              disabled={loading}
              style={{
                width: '100%',
                background: '#C8843A',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                color: '#0F0F0F',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              {loading ? 'Checking...' : 'Enter'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const newJobs = jobs.filter(j => j.status === 'new')
  const appliedJobs = jobs.filter(j => j.status === 'applied')
  const passedJobs = jobs.filter(j => j.status === 'passed')

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#C8843A',
          letterSpacing: '0.1em',
        }}>
          JOB LEADS
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#4A4846' }}>
            {newJobs.length} new · {appliedJobs.length} applied · {passedJobs.length} passed
          </span>
          <button
            onClick={fetchJobs}
            style={{
              background: 'none',
              border: '1px solid rgba(240,237,232,0.1)',
              borderRadius: '6px',
              color: '#8A8784',
              fontSize: '12px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={containerStyle}>
        {loading && (
          <div style={{
            textAlign: 'center',
            color: '#4A4846',
            padding: '60px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
          }}>
            Loading job leads...
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#4A4846',
            padding: '60px',
          }}>
            <div style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              marginBottom: '8px',
            }}>
              No job leads yet
            </div>
            <div style={{ fontSize: '13px' }}>
              The daily scan runs at 8am CT. Check back tomorrow.
            </div>
          </div>
        )}

        {[...newJobs, ...appliedJobs, ...passedJobs].map(job => (
          <div key={job.id} style={cardStyle(job.status)}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
              gap: '16px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#F0EDE8',
                  marginBottom: '4px',
                }}>
                  {job.title}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#8A8784',
                }}>
                  {job.company}
                  {job.location ? ` · ${job.location}` : ''}
                  {job.salary_display
                    ? ` · ${job.salary_display}`
                    : ' · Salary not listed'}
                </div>
              </div>
              <div style={{
                textAlign: 'right',
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: scoreColor(job.fit_score),
                  fontFamily: 'IBM Plex Mono, monospace',
                  lineHeight: 1,
                }}>
                  {job.fit_score}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#4A4846',
                  fontFamily: 'IBM Plex Mono, monospace',
                  marginTop: '2px',
                }}>
                  FIT SCORE
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '13px',
              color: '#8A8784',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}>
              {job.fit_summary}
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <button
                onClick={() => analyze(job)}
                style={{
                  background: '#C8843A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#0F0F0F',
                  fontSize: '12px',
                  fontWeight: '500',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              >
                Analyze →
              </button>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'none',
                  border: '1px solid rgba(240,237,232,0.1)',
                  borderRadius: '6px',
                  color: '#8A8784',
                  fontSize: '12px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              >
                View posting ↗
              </a>
              {job.status === 'new' && (
                <>
                  <button
                    onClick={() => updateStatus(job.id, 'applied')}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(74,222,128,0.2)',
                      borderRadius: '6px',
                      color: '#4ade80',
                      fontSize: '12px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                  >
                    Mark applied
                  </button>
                  <button
                    onClick={() => updateStatus(job.id, 'passed')}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(240,237,232,0.07)',
                      borderRadius: '6px',
                      color: '#4A4846',
                      fontSize: '12px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                  >
                    Pass
                  </button>
                </>
              )}
              {job.status === 'applied' && (
                <span style={{
                  fontSize: '11px',
                  color: '#4ade80',
                  fontFamily: 'IBM Plex Mono, monospace',
                  letterSpacing: '0.08em',
                }}>
                  APPLIED
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
