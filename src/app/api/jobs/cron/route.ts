import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDb, initDb } from '@/lib/db'
import { DNA_PROMPT } from '@/lib/dna'

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID!
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY!

const SEARCH_TITLES = [
  'Chief of Staff',
  'VP of Operations',
  'Director of Operations',
  'Revenue Operations Director',
  'Head of GTM',
  'Director of GTM Strategy',
  'Director of Strategic Initiatives',
  'VP Revenue Operations',
  'Head of Revenue Operations',
  'Director of Business Operations',
]

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initDb()
  const sql = getDb()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const results = { fetched: 0, scored: 0, saved: 0, errors: [] as string[] }

  for (const title of SEARCH_TITLES) {
    try {
      const query = encodeURIComponent(title)
      const url =
        `https://api.adzuna.com/v1/api/jobs/us/search/1` +
        `?app_id=${ADZUNA_APP_ID}` +
        `&app_key=${ADZUNA_APP_KEY}` +
        `&results_per_page=5` +
        `&what=${query}` +
        `&salary_min=150000` +
        `&full_time=1` +
        `&sort_by=date`

      const res = await fetch(url)
      const data = await res.json()
      const jobs = data.results || []
      results.fetched += jobs.length

      for (const job of jobs) {
        const existing = await sql`
          SELECT id FROM job_leads WHERE external_id = ${job.id}
        `
        if (existing.length > 0) continue

        const description = job.description || ''
        if (description.length < 100) continue

        try {
          const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 500,
            system: DNA_PROMPT,
            messages: [{
              role: 'user',
              content: `Score this job posting for Sam Manning.

JOB TITLE: ${job.title}
COMPANY: ${job.company?.display_name || 'Unknown'}
DESCRIPTION: ${description.slice(0, 2000)}

Return ONLY a JSON object:
{
  "score": <integer 0-100>,
  "label": "<Poor match|Partial match|Good match|Strong match|Exceptional match>",
  "summary": "<one sentence — why this is or isn't a strong match>"
}

No markdown, no preamble.`
            }]
          })

          results.scored++

          const content = message.content[0]
          if (content.type !== 'text') continue

                    const rawText = content.text.trim()
                    let scored: {score: number, label: string, summary: string} | null = null
                    try {
                      // Try direct parse first
                      scored = JSON.parse(rawText)
                    } catch {
                      // Find JSON by locating first { and last }
                      const start = rawText.indexOf('{')
                      const end = rawText.lastIndexOf('}')
                      if (start === -1 || end === -1 || end <= start) {
                        results.errors.push('No JSON found in: ' + rawText.slice(0, 100))
                        continue
                      }
                      try {
                        scored = JSON.parse(rawText.slice(start, end + 1))
                      } catch (e2) {
                        results.errors.push('Parse failed: ' + rawText.slice(0, 150))
                        continue
                      }
                    }
                    if (!scored) continue

          if (scored.score < 90) continue

          const salaryMin = job.salary_min ? Math.round(job.salary_min) : null
          const salaryMax = job.salary_max ? Math.round(job.salary_max) : null
          const salaryDisplay = salaryMin && salaryMax
            ? `$${(salaryMin / 1000).toFixed(0)}K – $${(salaryMax / 1000).toFixed(0)}K`
            : salaryMin
              ? `$${(salaryMin / 1000).toFixed(0)}K+`
              : null

          await sql`
            INSERT INTO job_leads (
              external_id, title, company, location,
              salary_min, salary_max, salary_display,
              description, url, fit_score, fit_label, fit_summary
            ) VALUES (
              ${String(job.id)},
              ${job.title},
              ${job.company?.display_name || 'Unknown'},
              ${job.location?.display_name || null},
              ${salaryMin},
              ${salaryMax},
              ${salaryDisplay},
              ${description},
              ${job.redirect_url},
              ${scored.score},
              ${scored.label},
              ${scored.summary}
            )
            ON CONFLICT (external_id) DO NOTHING
          `
          results.saved++

        } catch (scoreErr) {
          results.errors.push(`Score error for ${job.id}: ${String(scoreErr)}`)
        }

        await new Promise(r => setTimeout(r, 500))
      }

    } catch (fetchErr) {
      results.errors.push(`Fetch error for "${title}": ${String(fetchErr)}`)
    }
  }

  return Response.json({ success: true, ...results })
}
