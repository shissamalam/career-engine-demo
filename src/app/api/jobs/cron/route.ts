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

// Verified ATS board slugs — seed list. Dynamic discoveries stored in ats_companies table.
const TARGET_COMPANIES: { slug: string; name: string; ats: 'ashby' | 'lever' | 'greenhouse' }[] = [
  // Ashby — verified
  { slug: 'higharc',   name: 'Higharc',   ats: 'ashby' },
  { slug: 'sardine',   name: 'Sardine',   ats: 'ashby' },
  { slug: 'ema',       name: 'Ema',       ats: 'ashby' },
  { slug: 'salesloft', name: 'Salesloft', ats: 'ashby' },
  // Greenhouse — verified
  { slug: 'buildops',  name: 'BuildOps',  ats: 'greenhouse' },
  { slug: 'openspace', name: 'OpenSpace', ats: 'greenhouse' },
  { slug: 'apollo',    name: 'Apollo.io', ats: 'greenhouse' },
  { slug: 'gongio',    name: 'Gong',      ats: 'greenhouse' },
  { slug: 'salesloft', name: 'Salesloft', ats: 'greenhouse' },
]

export const maxDuration = 300

// ── Shared types ─────────────────────────────────────────────────────────────

type Results = {
  fetched: number
  scored: number
  saved: number
  errors: string[]
  bySource: Record<string, { fetched: number; saved: number }>
}

// ── Shared scoring helper ─────────────────────────────────────────────────────

const SCORING_PROMPT = `You are scoring a job posting for Sam Manning.

STEP 1 — LOCATION GATE (evaluate before anything else):
Is this role on-site or hybrid AND located outside the Austin, TX metro area AND does it not explicitly state remote work is available?
If YES to all three: output {"score": 0, "label": "Excluded - relocation required", "summary": "Role requires relocation outside Austin TX. Hard filter applied."} and stop immediately.

STEP 2 — Only if the role passed Step 1, score it 0–100 using this rubric:
- Role type fit (30 pts max): GTM Ops/RevOps/BizOps/AI Implementation with build = 25-30. Ops-heavy with some build = 15-24. Mixed with sales = 5-14. AE/BD/SWE/pure PM = 0-4.
- Company stage & size (20 pts max): Seed/Series A sub-50 people = 17-20. Series B 50-100 = 12-16. 100-200 people = 6-11. 200+ or enterprise = 0-5.
- Remote/location (15 pts max): Fully remote = 15. Remote-first optional Austin travel = 10-14. Hybrid Austin = 5-9. Outside Austin no remote = 0.
- Compensation signal (15 pts max): $180K+ stated = 13-15. $150-180K = 9-12. $120-150K with equity = 4-8. Below $120K = 0-3.
- Build ownership (10 pts max): Owns building from zero = 9-10. Significant build component = 6-8. Some tooling work = 3-5. Advisory/management only = 0-2.
- Adoption authority (5 pts max): Authority over implementation = 5. Reasonable cross-functional influence = 3-4. Hands off to others = 1-2. No adoption ownership = 0.
- Team caliber (5 pts max): YC/tier-1/technical founders = 5. Experienced founders with traction = 3-4. Unknown founders = 1-2. Red flags = 0.`

async function scoreJobWithClaude(
  client: Anthropic,
  title: string,
  company: string,
  location: string,
  description: string
): Promise<{ score: number; label: string; summary: string } | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: DNA_PROMPT,
      messages: [{
        role: 'user',
        content: `${SCORING_PROMPT}

JOB TITLE: ${title}
COMPANY: ${company}
LOCATION: ${location}
DESCRIPTION: ${description}

Return ONLY a JSON object, no markdown, no preamble:
{
  "score": <integer 0-100>,
  "label": "<Poor match|Partial match|Good match|Strong match|Exceptional match|Excluded - relocation required|Disqualified>",
  "summary": "<one sentence explaining the score or disqualification>"
}`,
      }],
    })

    const content = message.content[0]
    if (content.type !== 'text') return null

    const rawText = content.text.trim()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: Record<string, any> | null = null
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const start = rawText.indexOf('{')
      const end = rawText.lastIndexOf('}')
      if (start === -1 || end === -1 || end <= start) return null
      try {
        parsed = JSON.parse(rawText.slice(start, end + 1))
      } catch {
        return null
      }
    }
    if (!parsed) return null

    const score = typeof parsed.score === 'number' ? parsed.score : 0
    const label = typeof parsed.label === 'string' ? parsed.label : 'Unknown'
    // Handle AI typos in field name (summit, summery seen in prod)
    const summary =
      typeof parsed.summary === 'string' ? parsed.summary :
      typeof parsed.summit === 'string' ? parsed.summit :
      typeof parsed.summery === 'string' ? parsed.summery :
      (Object.values(parsed).find((v): v is string => typeof v === 'string' && v.length > 20) ?? '')

    return { score, label, summary }
  } catch {
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function bumpSource(results: Results, source: string, delta: { fetched?: number; saved?: number }) {
  if (!results.bySource[source]) results.bySource[source] = { fetched: 0, saved: 0 }
  if (delta.fetched) results.bySource[source].fetched += delta.fetched
  if (delta.saved) results.bySource[source].saved += delta.saved
}

// ── VibeCodeCareers scraper ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scrapeVibeCodeCareers(client: Anthropic, sql: any, results: Results) {
  try {
    const pageRes = await fetch('https://vibecodecareers.com/jobs/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    })
    const html = await pageRes.text()

    const remoteRecentUrls: string[] = []
    const seenUrls = new Set<string>()
    const articles = html.split(/<article[\s>]/)

    for (let i = 1; i < articles.length; i++) {
      const card = articles[i]

      const urlMatch = card.match(/href="(https:\/\/vibecodecareers\.com\/job\/[^"]+)"/)
      if (!urlMatch) continue
      const jobUrl = urlMatch[1]

      if (seenUrls.has(jobUrl)) continue
      seenUrls.add(jobUrl)

      if (!/\bRemote\b/i.test(card)) continue

      const postedMatch = card.match(/Posted\s+(\d+)\s*(min|hr|day)/i)
      if (!postedMatch) continue

      const amount = parseInt(postedMatch[1])
      const unit = postedMatch[2].toLowerCase()
      let hours = 999
      if (unit.startsWith('min')) hours = amount / 60
      else if (unit.startsWith('hr')) hours = amount
      else if (unit.startsWith('day')) hours = amount * 24

      if (hours <= 24) {
        remoteRecentUrls.push(jobUrl)
      }
    }

    results.fetched += remoteRecentUrls.length
    bumpSource(results, 'vibecodecareers', { fetched: remoteRecentUrls.length })

    for (const jobUrl of remoteRecentUrls) {
      try {
        const existing = await sql`SELECT id FROM job_leads WHERE url = ${jobUrl}`
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

        const scored = await scoreJobWithClaude(client, title, company, 'Remote', description.slice(0, 2000))
        results.scored++
        if (!scored || scored.score < 60) continue

        const slug = jobUrl.split('/job/')[1]?.replace(/\//g, '') || jobUrl
        const externalId = 'vcc-' + slug

        await sql`
          INSERT INTO job_leads (
            external_id, title, company, location,
            salary_min, salary_max, salary_display,
            description, url, fit_score, fit_label, fit_summary, source
          ) VALUES (
            ${externalId}, ${title}, ${company}, ${'Remote'},
            ${null}, ${null}, ${salaryDisplay},
            ${description.slice(0, 5000)}, ${jobUrl},
            ${scored.score}, ${scored.label}, ${scored.summary},
            ${'vibecodecareers'}
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        results.saved++
        bumpSource(results, 'vibecodecareers', { saved: 1 })

        await new Promise(r => setTimeout(r, 1000))

      } catch (jobErr) {
        results.errors.push(`VCC job error: ${String(jobErr)}`)
      }
    }

  } catch (err) {
    results.errors.push(`VCC scraper error: ${String(err)}`)
  }
}

// ── Ashby fetcher ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAshbyJobs(client: Anthropic, sql: any, results: Results) {
  const staticAshby = TARGET_COMPANIES.filter(c => c.ats === 'ashby')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicAshby = await sql`SELECT slug, name FROM ats_companies WHERE ats = 'ashby'`
  const ashbyCompanies = [
    ...staticAshby,
    ...dynamicAshby.map((r: { slug: string; name: string }) => ({ slug: r.slug, name: r.name, ats: 'ashby' as const })),
  ].filter((c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i)

  for (const company of ashbyCompanies) {
    try {
      const res = await fetch(
        `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (!res.ok) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as { jobPostings?: any[] }
      const jobs = data.jobPostings ?? []
      results.fetched += jobs.length
      bumpSource(results, 'ashby', { fetched: jobs.length })

      for (const job of jobs) {
        if (!job.isRemote && job.workplaceType !== 'Remote') continue

        const titleLower = (job.title ?? '').toLowerCase()
        const isRelevant = [
          'operations', 'revenue', 'gtm', 'go-to-market', 'bizops',
          'chief of staff', 'strategy', 'implementation', 'ai',
        ].some(kw => titleLower.includes(kw))
        if (!isRelevant) continue

        const externalId = `ashby-${job.id}`
        const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${externalId}`
        if (existing.length > 0) continue

        let salaryMin: number | null = null
        let salaryMax: number | null = null
        let salaryDisplay: string | null = null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const salaryTier = job.compensation?.compensationTiers?.find((t: any) => t.type === 'Salary')
        if (salaryTier) {
          salaryMin = salaryTier.minValue ?? null
          salaryMax = salaryTier.maxValue ?? null
          if (salaryMin && salaryMax) {
            salaryDisplay = `$${Math.round(salaryMin / 1000)}K – $${Math.round(salaryMax / 1000)}K`
          }
        }

        const description = (job.descriptionHtml ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (description.length < 100) continue

        const scored = await scoreJobWithClaude(
          client, job.title, company.name, 'Remote', description.slice(0, 2000)
        )
        if (!scored || scored.score < 60) continue
        results.scored++

        await sql`
          INSERT INTO job_leads (
            external_id, title, company, location,
            salary_min, salary_max, salary_display,
            description, url, fit_score, fit_label, fit_summary, source
          ) VALUES (
            ${externalId}, ${job.title}, ${company.name}, ${'Remote'},
            ${salaryMin}, ${salaryMax}, ${salaryDisplay},
            ${description.slice(0, 5000)}, ${job.jobUrl},
            ${scored.score}, ${scored.label}, ${scored.summary},
            ${'ashby'}
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        results.saved++
        bumpSource(results, 'ashby', { saved: 1 })
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      results.errors.push(`Ashby error for ${company.slug}: ${String(err)}`)
    }
  }
}

// ── Lever fetcher ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchLeverJobs(client: Anthropic, sql: any, results: Results) {
  const staticLever = TARGET_COMPANIES.filter(c => c.ats === 'lever')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicLever = await sql`SELECT slug, name FROM ats_companies WHERE ats = 'lever'`
  const leverCompanies = [
    ...staticLever,
    ...dynamicLever.map((r: { slug: string; name: string }) => ({ slug: r.slug, name: r.name, ats: 'lever' as const })),
  ].filter((c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i)

  for (const company of leverCompanies) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company.slug}?mode=json`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (!res.ok) continue

      const jobs = await res.json()
      if (!Array.isArray(jobs)) continue
      results.fetched += jobs.length
      bumpSource(results, 'lever', { fetched: jobs.length })

      for (const job of jobs) {
        const isRemote =
          job.workplaceType === 'remote' ||
          (job.categories?.location ?? '').toLowerCase().includes('remote')
        if (!isRemote) continue

        const titleLower = (job.text ?? '').toLowerCase()
        const isRelevant = [
          'operations', 'revenue', 'gtm', 'go-to-market', 'bizops',
          'chief of staff', 'strategy', 'implementation', 'ai',
        ].some(kw => titleLower.includes(kw))
        if (!isRelevant) continue

        const externalId = `lever-${job.id}`
        const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${externalId}`
        if (existing.length > 0) continue

        let salaryMin: number | null = null
        let salaryMax: number | null = null
        let salaryDisplay: string | null = null
        if (job.salaryRange) {
          salaryMin = job.salaryRange.min ?? null
          salaryMax = job.salaryRange.max ?? null
          if (salaryMin && salaryMax) {
            salaryDisplay = `$${Math.round(salaryMin / 1000)}K – $${Math.round(salaryMax / 1000)}K`
          }
        }

        const description = (job.descriptionPlain ?? job.description ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (description.length < 100) continue

        const jobLocation = job.categories?.location ?? 'Remote'
        const scored = await scoreJobWithClaude(
          client, job.text, company.name, jobLocation, description.slice(0, 2000)
        )
        if (!scored || scored.score < 60) continue
        results.scored++

        await sql`
          INSERT INTO job_leads (
            external_id, title, company, location,
            salary_min, salary_max, salary_display,
            description, url, fit_score, fit_label, fit_summary, source
          ) VALUES (
            ${externalId}, ${job.text}, ${company.name}, ${jobLocation},
            ${salaryMin}, ${salaryMax}, ${salaryDisplay},
            ${description.slice(0, 5000)}, ${job.hostedUrl ?? job.applyUrl},
            ${scored.score}, ${scored.label}, ${scored.summary},
            ${'lever'}
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        results.saved++
        bumpSource(results, 'lever', { saved: 1 })
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      results.errors.push(`Lever error for ${company.slug}: ${String(err)}`)
    }
  }
}

// ── Greenhouse fetcher ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchGreenhouseJobs(client: Anthropic, sql: any, results: Results) {
  const staticGH = TARGET_COMPANIES.filter(c => c.ats === 'greenhouse')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicGH = await sql`SELECT slug, name FROM ats_companies WHERE ats = 'greenhouse'`
  const ghCompanies = [
    ...staticGH,
    ...dynamicGH.map((r: { slug: string; name: string }) => ({ slug: r.slug, name: r.name, ats: 'greenhouse' as const })),
  ].filter((c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i)

  for (const company of ghCompanies) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (!res.ok) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json() as { jobs?: any[] }
      const jobs = data.jobs ?? []
      results.fetched += jobs.length
      bumpSource(results, 'greenhouse', { fetched: jobs.length })

      for (const job of jobs) {
        const locationStr = (job.location?.name ?? '').toLowerCase()
        const isRemote = locationStr.includes('remote') || locationStr.includes('anywhere')
        if (!isRemote) continue

        const titleLower = (job.title ?? '').toLowerCase()
        const isRelevant = [
          'operations', 'revenue', 'gtm', 'go-to-market', 'bizops',
          'chief of staff', 'strategy', 'implementation', 'ai',
        ].some(kw => titleLower.includes(kw))
        if (!isRelevant) continue

        const externalId = `greenhouse-${job.id}`
        const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${externalId}`
        if (existing.length > 0) continue

        const description = (job.content ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        if (description.length < 100) continue

        const jobLocation = job.location?.name ?? 'Remote'
        const scored = await scoreJobWithClaude(
          client, job.title, company.name, jobLocation, description.slice(0, 2000)
        )
        if (!scored || scored.score < 60) continue
        results.scored++

        await sql`
          INSERT INTO job_leads (
            external_id, title, company, location,
            salary_min, salary_max, salary_display,
            description, url, fit_score, fit_label, fit_summary, source
          ) VALUES (
            ${externalId}, ${job.title}, ${company.name}, ${jobLocation},
            ${null}, ${null}, ${null},
            ${description.slice(0, 5000)}, ${job.absolute_url},
            ${scored.score}, ${scored.label}, ${scored.summary},
            ${'greenhouse'}
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        results.saved++
        bumpSource(results, 'greenhouse', { saved: 1 })
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      results.errors.push(`Greenhouse error for ${company.slug}: ${String(err)}`)
    }
  }
}

// ── AEC Tech Jobs RSS fetcher ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAecTechJobsRSS(client: Anthropic, sql: any, results: Results) {
  try {
    const res = await fetch('https://aectechjobs.substack.com/feed', {
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
    })
    if (!res.ok) return

    const xml = await res.text()
    const items = xml.split('<item>')
    results.fetched += items.length - 1
    bumpSource(results, 'aectechjobs', { fetched: items.length - 1 })

    for (let i = 1; i < items.length; i++) {
      const item = items[i]

      const titleMatch =
        item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
        item.match(/<title>([^<]+)<\/title>/)
      const linkMatch =
        item.match(/<link>([^<]+)<\/link>/) ||
        item.match(/<guid[^>]*>([^<]+)<\/guid>/)
      const descMatch =
        item.match(/<description><!\[CDATA\[([\s\S]+?)\]\]><\/description>/) ||
        item.match(/<description>([^<]+)<\/description>/)

      if (!titleMatch || !linkMatch) continue

      const title = titleMatch[1].trim()
      const url = linkMatch[1].trim()
      const rawDesc = descMatch ? descMatch[1] : ''
      const description = rawDesc
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (description.length < 50) continue

      const externalId = `aectechjobs-${Buffer.from(url).toString('base64').slice(0, 32)}`
      const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${externalId}`
      if (existing.length > 0) continue

      const atMatch = title.match(/\bat\s+(.+)$/i)
      const company = atMatch ? atMatch[1].trim() : 'AEC Tech Company'
      const jobTitle = atMatch ? title.replace(atMatch[0], '').trim() : title

      const scored = await scoreJobWithClaude(
        client, jobTitle, company, 'Remote', description.slice(0, 2000)
      )
      if (!scored || scored.score < 60) continue
      results.scored++

      await sql`
        INSERT INTO job_leads (
          external_id, title, company, location,
          salary_min, salary_max, salary_display,
          description, url, fit_score, fit_label, fit_summary, source
        ) VALUES (
          ${externalId}, ${jobTitle}, ${company}, ${'Remote'},
          ${null}, ${null}, ${null},
          ${description.slice(0, 5000)}, ${url},
          ${scored.score}, ${scored.label}, ${scored.summary},
          ${'aectechjobs'}
        )
        ON CONFLICT (external_id) DO NOTHING
      `
      results.saved++
      bumpSource(results, 'aectechjobs', { saved: 1 })
      await new Promise(r => setTimeout(r, 500))
    }
  } catch (err) {
    results.errors.push(`AEC Tech Jobs RSS error: ${String(err)}`)
  }
}

// ── ATS company discovery ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function discoverAndVerifyATSCompanies(sql: any, results: Results) {
  const companyNames: string[] = []

  // Step A: Procore marketplace for AEC company names
  try {
    const res = await fetch('https://marketplace.procore.com/apps?category=all', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    })
    if (res.ok) {
      const html = await res.text()
      Array.from(html.matchAll(/"name"\s*:\s*"([^"]{3,50})"/g)).forEach(match => {
        const name = match[1].trim()
        if (name && !name.includes('\\') && /^[A-Za-z]/.test(name)) {
          companyNames.push(name)
        }
      })
    }
  } catch (err) {
    results.errors.push(`Procore discovery error: ${String(err)}`)
  }

  // Step B: Known AEC-tech and GTM companies to probe
  const additionalCompanies = [
    'Dusty Robotics', 'Versatile', 'Constraint', 'Buildots',
    'Reconstruct', 'Holobuilder', 'Multivista', 'Fieldwire',
    'PlanGrid', 'Procore', 'Autodesk', 'Bluebeam', 'Newforma',
    'InEight', 'Kahua', 'Corecon', 'eSUB', 'Projectmates',
    'Constructive', 'Finalform', 'Trunk Tools', 'Kojo',
    'Constrafor', 'Billd', 'Levelset', 'Rabbet', 'Honest Buildings',
    'Northspyre', 'Aquifer', 'Higharc', 'Monograph', 'Forma',
    'Spacemaker', 'Swapp', 'Archistar', 'TestFit', 'Hypar',
    'Clari', 'Gong', 'Outreach', 'Salesloft', 'Apollo',
    'People AI', 'Chorus', 'Jiminny', 'Wingman', 'Refine Labs',
    'Commsor', 'Common Room', 'Crossbeam', 'Partnerstack',
    'Reveal', 'Allbound', 'Impartner', 'Channeltivity',
  ]
  companyNames.push(...additionalCompanies)

  const uniqueNames = Array.from(new Set(companyNames))

  // Step C: Load already-verified slugs to avoid re-probing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alreadyVerified = await sql`SELECT slug, ats FROM ats_companies`
  const verifiedSet = new Set(
    alreadyVerified.map((r: { slug: string; ats: string }) => `${r.slug}:${r.ats}`)
  )

  let newDiscoveries = 0

  for (const name of uniqueNames.slice(0, 15)) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const slugCandidates = [
      baseSlug,
      baseSlug.replace(/-/g, ''),
      baseSlug.replace(/-inc$|-llc$|-corp$/, ''),
      baseSlug.replace(/-ai$/, '') + 'ai',
      baseSlug + '-inc',
    ].filter((s, i, arr) => s.length > 1 && arr.indexOf(s) === i)

    for (const slug of slugCandidates) {
      // Probe Ashby
      if (!verifiedSet.has(`${slug}:ashby`)) {
        try {
          const r = await fetch(
            `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
            { signal: AbortSignal.timeout(1500) }
          )
          if (r.ok) {
            await sql`
              INSERT INTO ats_companies (slug, name, ats)
              VALUES (${slug}, ${name}, 'ashby')
              ON CONFLICT (slug, ats) DO UPDATE SET last_checked = NOW()
            `
            verifiedSet.add(`${slug}:ashby`)
            newDiscoveries++
          }
        } catch { /* timeout or network error — skip */ }
      }

      // Probe Lever
      if (!verifiedSet.has(`${slug}:lever`)) {
        try {
          const r = await fetch(
            `https://api.lever.co/v0/postings/${slug}?mode=json`,
            { signal: AbortSignal.timeout(1500) }
          )
          if (r.ok) {
            await sql`
              INSERT INTO ats_companies (slug, name, ats)
              VALUES (${slug}, ${name}, 'lever')
              ON CONFLICT (slug, ats) DO UPDATE SET last_checked = NOW()
            `
            verifiedSet.add(`${slug}:lever`)
            newDiscoveries++
          }
        } catch { /* timeout or network error — skip */ }
      }

      // Probe Greenhouse
      if (!verifiedSet.has(`${slug}:greenhouse`)) {
        try {
          const r = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
            { signal: AbortSignal.timeout(1500) }
          )
          if (r.ok) {
            await sql`
              INSERT INTO ats_companies (slug, name, ats)
              VALUES (${slug}, ${name}, 'greenhouse')
              ON CONFLICT (slug, ats) DO UPDATE SET last_checked = NOW()
            `
            verifiedSet.add(`${slug}:greenhouse`)
            newDiscoveries++
          }
        } catch { /* timeout or network error — skip */ }
      }

    }
  }

  results.errors.push(`ATS discovery: ${newDiscoveries} new companies verified`)
}

// ── YC Work at a Startup ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchYCFallback(client: Anthropic, sql: any, results: Results) {
  try {
    const res = await fetch(
      'https://www.workatastartup.com/jobs?role=operations&remote=only&jobType=fulltime',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      }
    )
    if (!res.ok) return
    const html = await res.text()

    const jobUrls = Array.from(new Set(
      Array.from(html.matchAll(/href="(\/jobs\/\d+[^"]+)"/g))
        .map(m => `https://www.workatastartup.com${m[1]}`)
    )).slice(0, 8)

    results.fetched += jobUrls.length
    bumpSource(results, 'ycombinator', { fetched: jobUrls.length })

    for (const jobUrl of jobUrls) {
      const externalId = `yc-${Buffer.from(jobUrl).toString('base64').slice(0, 24)}`
      const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${externalId}`
      if (existing.length > 0) continue

      try {
        const detailRes = await fetch(jobUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-bot/1.0)' },
        })
        const detailHtml = await detailRes.text()

        const titleMatch =
          detailHtml.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
          detailHtml.match(/<meta property="og:title" content="([^"]+)"/)
        const companyMatch =
          detailHtml.match(/"company"[^}]*"name"\s*:\s*"([^"]+)"/) ||
          detailHtml.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)</)

        const title = titleMatch?.[1]?.trim() ?? 'Unknown'
        const company = companyMatch?.[1]?.trim() ?? 'YC Company'

        const description = detailHtml
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(500, 3500)

        if (description.length < 100) continue

        const scored = await scoreJobWithClaude(
          client, title, company, 'Remote', description.slice(0, 2000)
        )
        if (!scored || scored.score < 60) continue
        results.scored++

        await sql`
          INSERT INTO job_leads (
            external_id, title, company, location,
            salary_min, salary_max, salary_display,
            description, url, fit_score, fit_label, fit_summary, source
          ) VALUES (
            ${externalId}, ${title}, ${company}, ${'Remote'},
            ${null}, ${null}, ${null},
            ${description.slice(0, 5000)}, ${jobUrl},
            ${scored.score}, ${scored.label}, ${scored.summary},
            ${'ycombinator'}
          )
          ON CONFLICT (external_id) DO NOTHING
        `
        results.saved++
        bumpSource(results, 'ycombinator', { saved: 1 })
        await new Promise(r => setTimeout(r, 500))
      } catch (jobErr) {
        results.errors.push(`YC job error: ${String(jobErr)}`)
      }
    }
  } catch (err) {
    results.errors.push(`YC fallback error: ${String(err)}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchYCJobs(client: Anthropic, sql: any, results: Results) {
  try {
    const res = await fetch(
      'https://api.workatastartup.com/companies/search?' +
      'query=&' +
      'remote=only&' +
      'role=operations&' +
      'jobType=fulltime&' +
      'companySize=seed,small&' +
      'industry=Real%20Estate%20and%20Construction,B2B%20Software%20and%20Services',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; career-bot/1.0)',
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    )

    if (!res.ok) {
      results.errors.push(`YC API returned ${res.status} — trying fallback`)
      await fetchYCFallback(client, sql, results)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as { jobs?: any[]; hits?: any[]; results?: any[] }
    const jobs = data.jobs ?? data.hits ?? data.results ?? []
    results.fetched += jobs.length
    bumpSource(results, 'ycombinator', { fetched: jobs.length })

    if (jobs.length === 0) {
      // API responded but returned no jobs — run fallback scraper
      await fetchYCFallback(client, sql, results)
      return
    }

    for (const job of jobs) {
      const title = job.title ?? job.job_title ?? ''
      const company = job.company_name ?? job.company?.name ?? ''
      const jobUrl = job.url ?? job.job_url ?? `https://www.workatastartup.com/jobs/${job.id}`
      const description = (job.description ?? job.job_description ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (!title || description.length < 100) continue

      const externalId = `yc-${job.id ?? Buffer.from(jobUrl).toString('base64').slice(0, 24)}`
      const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${externalId}`
      if (existing.length > 0) continue

      const scored = await scoreJobWithClaude(
        client, title, company, 'Remote', description.slice(0, 2000)
      )
      if (!scored || scored.score < 60) continue
      results.scored++

      await sql`
        INSERT INTO job_leads (
          external_id, title, company, location,
          salary_min, salary_max, salary_display,
          description, url, fit_score, fit_label, fit_summary, source
        ) VALUES (
          ${externalId}, ${title}, ${company}, ${'Remote'},
          ${null}, ${null}, ${null},
          ${description.slice(0, 5000)}, ${jobUrl},
          ${scored.score}, ${scored.label}, ${scored.summary},
          ${'ycombinator'}
        )
        ON CONFLICT (external_id) DO NOTHING
      `
      results.saved++
      bumpSource(results, 'ycombinator', { saved: 1 })
      await new Promise(r => setTimeout(r, 500))
    }
  } catch (err) {
    results.errors.push(`YC scraper error: ${String(err)}`)
    await fetchYCFallback(client, sql, results)
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initDb()
  const sql = getDb()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const results: Results = {
    fetched: 0,
    scored: 0,
    saved: 0,
    errors: [],
    bySource: {},
  }

  // ── Adzuna ──────────────────────────────────────────────────────────────────

  for (const title of SEARCH_TITLES) {
    try {
      const query = encodeURIComponent(title)
      const url =
        `https://api.adzuna.com/v1/api/jobs/us/search/1` +
        `?app_id=${ADZUNA_APP_ID}` +
        `&app_key=${ADZUNA_APP_KEY}` +
        `&results_per_page=5` +
        `&what=${query}` +
        `&full_time=1` +
        `&sort_by=date`

      const res = await fetch(url)
      const data = await res.json()
      const jobs = data.results || []
      results.fetched += jobs.length
      bumpSource(results, 'adzuna', { fetched: jobs.length })

      for (const job of jobs) {
        const existing = await sql`SELECT id FROM job_leads WHERE external_id = ${job.id}`
        if (existing.length > 0) continue

        const description = job.description || ''
        if (description.length < 100) continue

        try {
          const scored = await scoreJobWithClaude(
            client,
            job.title,
            job.company?.display_name || 'Unknown',
            job.location?.display_name || 'Unknown',
            description.slice(0, 2000)
          )
          results.scored++
          if (!scored || scored.score < 70) continue

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
              ${salaryMin}, ${salaryMax}, ${salaryDisplay},
              ${description},
              ${job.redirect_url},
              ${scored.score}, ${scored.label}, ${scored.summary},
              ${'adzuna'}
            )
            ON CONFLICT (external_id) DO NOTHING
          `
          results.saved++
          bumpSource(results, 'adzuna', { saved: 1 })

        } catch (scoreErr) {
          results.errors.push(`Score error for ${job.id}: ${String(scoreErr)}`)
        }

        await new Promise(r => setTimeout(r, 500))
      }

    } catch (fetchErr) {
      results.errors.push(`Fetch error for "${title}": ${String(fetchErr)}`)
    }
  }

  // ── Additional sources ──────────────────────────────────────────────────────

  await scrapeVibeCodeCareers(client, sql, results)

  // Discover new ATS companies from Procore + known list, then poll all verified companies
  await discoverAndVerifyATSCompanies(sql, results)
  await fetchAshbyJobs(client, sql, results)
  await fetchLeverJobs(client, sql, results)
  await fetchGreenhouseJobs(client, sql, results)

  // YC Work at a Startup
  await fetchYCJobs(client, sql, results)

  // AEC Tech Jobs RSS
  await fetchAecTechJobsRSS(client, sql, results)

  return Response.json({ success: true, ...results })
}
