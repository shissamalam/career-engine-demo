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

function parsePostedHours(postedText: string): number {
  const text = postedText.toLowerCase()
  const minsMatch = text.match(/(\d+)\s*min/)
  if (minsMatch) return parseInt(minsMatch[1]) / 60
  const hoursMatch = text.match(/(\d+)\s*hr/)
  if (hoursMatch) return parseInt(hoursMatch[1])
  const daysMatch = text.match(/(\d+)\s*day/)
  if (daysMatch) return parseInt(daysMatch[1]) * 24
  return 999
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scrapeVibeCodeCareers(
  client: Anthropic,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  results: { fetched: number; scored: number; saved: number; errors: string[] }
) {
  try {
    const pageRes = await fetch('https://vibecodecareers.com/jobs/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; career-bot/1.0)',
        'Accept': 'text/html',
      },
    })
    const html = await pageRes.text()

    // Find job cards that are Remote AND posted within 24 hours
    const remoteRecentUrls: string[] = []
    const cardPattern = /href="(https:\/\/vibecodecareers\.com\/job\/[^"]+)"[\s\S]{0,2000}?Remote[\s\S]{0,500}?Posted\s+(\d+)\s*(min|hr|day)/gi
    let cardMatch: RegExpExecArray | null
    while ((cardMatch = cardPattern.exec(html)) !== null) {
      const url = cardMatch[1]
      const amount = parseInt(cardMatch[2])
      const unit = cardMatch[3].toLowerCase()

      let hours = 999
      if (unit.startsWith('min')) hours = amount / 60
      else if (unit.startsWith('hr')) hours = amount
      else if (unit.startsWith('day')) hours = amount * 24

      if (hours <= 24 && !remoteRecentUrls.includes(url)) {
        remoteRecentUrls.push(url)
      }
    }

    results.fetched += remoteRecentUrls.length

    for (const jobUrl of remoteRecentUrls) {
      try {
        const existing = await sql`
          SELECT id FROM job_leads WHERE url = ${jobUrl}
        `
        if (existing.length > 0) continue

        const detailRes = await fetch(jobUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; career-bot/1.0)',
            'Accept': 'text/html',
          },
        })
        const detailHtml = await detailRes.text()

        const titleMatch =
          detailHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/) ||
          detailHtml.match(/<h1[^>]*>([^<]+)<\/h1>/)
        const title = titleMatch
          ? titleMatch[1].replace(' - VibeCodeCareers', '').trim()
          : 'Unknown'

        const companyMatch =
          detailHtml.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)</) ||
          detailHtml.match(/"hiringOrganization"[^}]*"name"\s*:\s*"([^"]+)"/)
        const company = companyMatch ? companyMatch[1].trim() : 'Unknown'

        const salaryMatch = detailHtml.match(/\$[\d,]+\s*[-–]\s*\$[\d,]+(?:\/yr)?/)
        const salaryDisplay = salaryMatch ? salaryMatch[0].replace('/yr', '') : null

        const bodyMatch =
          detailHtml.match(/<div[^>]*class="[^"]*job[^"]*description[^"]*"[^>]*>([\s\S]+?)<\/div>/) ||
          detailHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]{200,}?)<\/div>/)
        let description = ''
        if (bodyMatch) {
          description = bodyMatch[1]
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        }

        if (description.length < 100) {
          description = detailHtml
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(500, 3000)
        }

        if (description.length < 100) continue

        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: DNA_PROMPT,
          messages: [{
            role: 'user',
            content: `Score this job posting for Sam Manning.

JOB TITLE: ${title}
COMPANY: ${company}
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let scored: { score: number; label: string; summary: string } | null = null
        try {
          scored = JSON.parse(rawText)
        } catch {
          const start = rawText.indexOf('{')
          const end = rawText.lastIndexOf('}')
          if (start === -1 || end === -1 || end <= start) continue
          try {
            scored = JSON.parse(rawText.slice(start, end + 1))
          } catch {
            continue
          }
        }
        if (!scored) continue
        if (scored.score < 60) continue

        const slug = jobUrl.split('/job/')[1]?.replace(/\//g, '') || jobUrl
        const externalId = 'vcc-' + slug

        await sql`
          INSERT INTO job_leads (
            external_id, title, company, location,
            salary_min, salary_max, salary_display,
            description, url, fit_score, fit_label, fit_summary, source
          ) VALUES (
            ${externalId},
            ${title},
            ${company},
            ${'Remote'},
            ${null},
            ${null},
            ${salaryDisplay},
            ${description.slice(0, 5000)},
            ${jobUrl},
            ${scored.score},
            ${scored.label},
            ${scored.summary},
            ${'vibecodecareers'}
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        results.saved++

        await new Promise(r => setTimeout(r, 1000))

      } catch (jobErr) {
        results.errors.push(`VCC job error: ${String(jobErr)}`)
      }
    }

  } catch (err) {
    results.errors.push(`VCC scraper error: ${String(err)}`)
  }
}

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
        `&results_per_page=10` +
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

          const cleaned = content.text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim()

          const scored = JSON.parse(cleaned)

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
              description, url, fit_score, fit_label, fit_summary, source
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
              ${scored.summary},
              ${'adzuna'}
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

  // Run VibeCodeCareers scraper
  await scrapeVibeCodeCareers(client, sql, results)

  return Response.json({ success: true, ...results })
}
