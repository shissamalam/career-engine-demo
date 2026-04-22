import { parse as parseHtml } from 'node-html-parser'

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobLead = {
  externalId: string
  company: string
  title: string
  location: string
  isRemote: boolean
  locationUnverified: boolean
  requiresManualReview: boolean
  applyUrl: string
  description: string
  scrapedAt: string
  source: 'target-ashby' | 'target-greenhouse' | 'target-custom'
}

type AshbyTarget      = { name: string; type: 'ashby';      slug: string }
type GreenhouseTarget = { name: string; type: 'greenhouse'; slug: string }
type CustomTarget     = { name: string; type: 'custom';     url: string  }
type Target = AshbyTarget | GreenhouseTarget | CustomTarget

// ── Target company list ───────────────────────────────────────────────────────

export const TARGETS: Target[] = [
  // TYPE A — Ashby (public JSON API)
  { name: 'Jasper AI',            type: 'ashby',      slug: 'Jasper%20AI'          },
  { name: 'Boon',                 type: 'ashby',      slug: 'boon'                 },
  { name: 'Unlimited Industries', type: 'ashby',      slug: 'unlimitedindustries'  },

  // TYPE B — Greenhouse (public REST API)
  { name: 'Qualified Health',     type: 'greenhouse', slug: 'qualifiedhealth'      },
  { name: 'Seso Labor',           type: 'greenhouse', slug: 'sesolabor'            },

  // TYPE C — Custom career pages (fetch + parse)
  { name: 'Matter',               type: 'custom', url: 'https://www.matter.com/team'                                       },
  { name: 'GC.ai',                type: 'custom', url: 'https://gc.ai/company/careers'                                     },
  { name: 'Briq',                 type: 'custom', url: 'https://careers.briq.ai/#positions'                                },
  { name: 'Document Crunch',      type: 'custom', url: 'https://www.documentcrunch.com/careers#open-roles'                 },
  { name: 'Higharc',              type: 'custom', url: 'https://www.higharc.com/company/careers#open-positions'            },
  { name: 'Positron AI',          type: 'custom', url: 'https://www.positron.ai/careers'                                   },
  { name: 'Vanta',                type: 'custom', url: 'https://www.vanta.com/company/careers#open-roles'                  },
  { name: 'VulnCheck',            type: 'custom', url: 'https://www.vulncheck.com/careers'                                 },
  { name: 'Tabs',                 type: 'custom', url: 'https://www.tabs.com/careers#open-positions'                       },
  { name: 'Actively AI',          type: 'custom', url: 'https://www.actively.ai/careers'                                   },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the job is fully remote or located within the Austin-area
 * commute radius from Georgetown TX (78626).
 */
export function isAustinOrRemote(locationString: string, isRemote: boolean): boolean {
  if (isRemote) return true
  if (!locationString) return false
  const loc = locationString.toLowerCase()
  const remoteKeywords = ['remote', 'anywhere', 'distributed', 'worldwide', 'global']
  const austinKeywords = [
    'austin', 'georgetown', 'round rock', 'cedar park', 'leander',
    'pflugerville', 'hutto', 'taylor', 'buda', 'kyle', 'san marcos',
    'texas', ' tx',
  ]
  return (
    remoteKeywords.some(k => loc.includes(k)) ||
    austinKeywords.some(k => loc.includes(k))
  )
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function manualReviewPlaceholder(
  company: string,
  careerUrl: string,
  reason: string,
  source: JobLead['source'],
  idSuffix = 'manual',
): JobLead {
  return {
    externalId:          `target-manual-${slugify(company)}-${idSuffix}`,
    company,
    title:               'Check careers page manually',
    location:            '',
    isRemote:            false,
    locationUnverified:  true,
    requiresManualReview: true,
    applyUrl:            careerUrl,
    description:         reason,
    scrapedAt:           new Date().toISOString(),
    source,
  }
}

// ── Ashby scraper ─────────────────────────────────────────────────────────────

async function scrapeAshby(target: AshbyTarget): Promise<JobLead[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${target.slug}?includeCompensation=false`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  type AshbyJob = {
    id: string
    title: string
    isRemote: boolean
    workplaceType: string
    locationName?: string
    jobUrl: string
    descriptionHtml?: string
  }
  const data = await res.json() as { jobs?: AshbyJob[] }
  const jobs = data.jobs ?? []
  const now  = new Date().toISOString()
  const results: JobLead[] = []

  for (const job of jobs) {
    const remote   = job.isRemote || job.workplaceType === 'Remote'
    const location = job.locationName ?? (remote ? 'Remote' : '')
    if (!isAustinOrRemote(location, remote)) continue

    const description = (job.descriptionHtml ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    results.push({
      externalId:           `target-ashby-${slugify(target.slug)}-${job.id}`,
      company:              target.name,
      title:                job.title,
      location:             location || 'Remote',
      isRemote:             remote,
      locationUnverified:   false,
      requiresManualReview: false,
      applyUrl:             job.jobUrl,
      description:          description.slice(0, 5_000),
      scrapedAt:            now,
      source:               'target-ashby',
    })
  }
  return results
}

// ── Greenhouse scraper ────────────────────────────────────────────────────────

async function scrapeGreenhouse(target: GreenhouseTarget): Promise<JobLead[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${target.slug}/jobs?content=true`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  type GHJob = {
    id: number
    title: string
    location: { name: string }
    absolute_url: string
    content?: string
  }
  const data = await res.json() as { jobs?: GHJob[] }
  const jobs = data.jobs ?? []
  const now  = new Date().toISOString()
  const results: JobLead[] = []

  for (const job of jobs) {
    const locationStr = job.location?.name ?? ''
    const remote = locationStr.toLowerCase().includes('remote') ||
                   locationStr.toLowerCase().includes('anywhere')
    if (!isAustinOrRemote(locationStr, remote)) continue

    const description = (job.content ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    results.push({
      externalId:           `target-gh-${target.slug}-${job.id}`,
      company:              target.name,
      title:                job.title,
      location:             locationStr || 'Remote',
      isRemote:             remote,
      locationUnverified:   false,
      requiresManualReview: false,
      applyUrl:             job.absolute_url,
      description:          description.slice(0, 5_000),
      scrapedAt:            now,
      source:               'target-greenhouse',
    })
  }
  return results
}

// ── Custom page scraper ───────────────────────────────────────────────────────

async function scrapeCustomPage(target: CustomTarget): Promise<JobLead[]> {
  // Strip fragment — fetch() does not send fragments to the server
  const fetchUrl = target.url.split('#')[0]
  const source: JobLead['source'] = 'target-custom'
  const now = new Date().toISOString()

  let html: string
  try {
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) {
      return [manualReviewPlaceholder(
        target.name, target.url,
        `Automated scrape returned HTTP ${res.status}. Visit ${target.url} directly.`,
        source,
      )]
    }
    html = await res.text()
  } catch (err) {
    return [manualReviewPlaceholder(
      target.name, target.url,
      `Fetch failed: ${err instanceof Error ? err.message : String(err)}. Visit ${target.url} directly.`,
      source,
    )]
  }

  // Very short response = JS-rendered SPA shell, nothing to parse
  if (html.length < 500) {
    return [manualReviewPlaceholder(
      target.name, target.url,
      `Page returned minimal HTML (likely JS-rendered). Visit ${target.url} directly.`,
      source,
      'spa',
    )]
  }

  const root    = parseHtml(html)
  const results: JobLead[] = []
  const seen    = new Set<string>()

  // ── Strategy 1: JSON-LD structured data ───────────────────────────────────
  for (const el of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const raw  = JSON.parse(el.text)
      const items = Array.isArray(raw) ? raw : [raw]
      for (const item of items) {
        if (item['@type'] !== 'JobPosting') continue
        const title = String(item.title ?? '').trim()
        if (!title || seen.has(title)) continue

        const locCity  = item.jobLocation?.address?.addressLocality ?? ''
        const locState = item.jobLocation?.address?.addressRegion   ?? ''
        const locName  = [locCity, locState].filter(Boolean).join(', ')
        const remote   = item.jobLocationType === 'TELECOMMUTE'

        if (!isAustinOrRemote(locName, remote) && locName) continue // skip clear non-matches
        seen.add(title)

        const applyRaw = item.url ?? item.sameAs ?? target.url
        const applyUrl = typeof applyRaw === 'string' ? applyRaw : target.url
        const desc     = String(item.description ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        results.push({
          externalId:           `target-custom-${slugify(target.name)}-${simpleHash(title)}`,
          company:              target.name,
          title,
          location:             remote ? 'Remote' : (locName || 'See posting'),
          isRemote:             remote,
          locationUnverified:   !locName && !remote,
          requiresManualReview: !locName && !remote,
          applyUrl,
          description:          desc.slice(0, 5_000),
          scrapedAt:            now,
          source,
        })
      }
    } catch { /* invalid JSON-LD — skip silently */ }
  }

  if (results.length > 0) return results

  // ── Strategy 2: detect Greenhouse/Lever/Ashby embed boards ───────────────
  const ghMatch  = html.match(/boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/)
  const leverMatch = html.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/)
  if (ghMatch) {
    return [manualReviewPlaceholder(
      target.name,
      `https://boards.greenhouse.io/${ghMatch[1]}`,
      `This company embeds a Greenhouse board (slug: ${ghMatch[1]}). Visit directly or add to Greenhouse targets list.`,
      source, 'gh-embed',
    )]
  }
  if (leverMatch) {
    return [manualReviewPlaceholder(
      target.name,
      `https://jobs.lever.co/${leverMatch[1]}`,
      `This company embeds a Lever board (slug: ${leverMatch[1]}). Visit directly.`,
      source, 'lever-embed',
    )]
  }

  // ── Strategy 3: DOM heuristics ────────────────────────────────────────────
  const titleKeywords = [
    'engineer', 'manager', 'director', 'designer', 'analyst',
    'operations', 'product', 'sales', 'marketing', 'developer',
    'lead', 'head of', 'vp of', 'chief', 'specialist', 'coordinator',
    'associate', 'senior', 'principal', 'founding',
  ]

  const candidateEls = [
    ...root.querySelectorAll('a'),
    ...root.querySelectorAll('h2'),
    ...root.querySelectorAll('h3'),
    ...root.querySelectorAll('h4'),
    ...root.querySelectorAll('[class*="job"]'),
    ...root.querySelectorAll('[class*="position"]'),
    ...root.querySelectorAll('[class*="role"]'),
    ...root.querySelectorAll('[class*="opening"]'),
  ]

  for (const el of candidateEls) {
    const text  = el.text.replace(/\s+/g, ' ').trim()
    if (text.length < 4 || text.length > 130) continue
    const lower = text.toLowerCase()
    if (!titleKeywords.some(k => lower.includes(k))) continue
    if (seen.has(text)) continue
    seen.add(text)

    // Walk up to find nearest block parent for context
    let parentEl = el.parentNode
    for (let i = 0; i < 3 && parentEl; i++) {
      const tag = (parentEl as typeof el).tagName?.toLowerCase() ?? ''
      if (['li', 'article', 'section'].includes(tag)) break
      parentEl = (parentEl as typeof el).parentNode
    }
    const parentText = parentEl ? (parentEl as typeof el).text.replace(/\s+/g, ' ').trim() : ''
    const context    = (parentText + ' ' + text).toLowerCase()
    const isRemote   = context.includes('remote') || context.includes('distributed')
    const hasAustin  = ['austin', ' tx', 'texas'].some(k => context.includes(k))

    // Skip roles that are clearly in a different city
    const otherCities = ['new york', 'san francisco', 'seattle', 'chicago', 'boston', 'los angeles', 'denver', 'london', 'toronto']
    if (!isRemote && !hasAustin && otherCities.some(c => context.includes(c))) continue

    const rawHref  = el.getAttribute('href') ?? ''
    let applyUrl   = rawHref
    if (applyUrl && !applyUrl.startsWith('http')) {
      try { applyUrl = new URL(rawHref, target.url).href } catch { applyUrl = target.url }
    }
    if (!applyUrl) applyUrl = target.url

    results.push({
      externalId:           `target-custom-${slugify(target.name)}-${simpleHash(text)}`,
      company:              target.name,
      title:                text,
      location:             isRemote ? 'Remote' : hasAustin ? 'Austin, TX' : 'See posting',
      isRemote,
      locationUnverified:   !isRemote && !hasAustin,
      requiresManualReview: !isRemote && !hasAustin,
      applyUrl,
      description:          parentText.slice(0, 1_000),
      scrapedAt:            now,
      source,
    })
  }

  if (results.length > 0) return results

  // ── Nothing parsed — return manual review placeholder ─────────────────────
  return [manualReviewPlaceholder(
    target.name, target.url,
    `Could not parse job listings automatically (may be JS-rendered or bot-protected). Visit ${target.url} directly.`,
    source, 'no-parse',
  )]
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function scrapeAllTargets(): Promise<{ leads: JobLead[]; errors: string[] }> {
  const leads:  JobLead[] = []
  const errors: string[]  = []

  for (const target of TARGETS) {
    try {
      let batch: JobLead[] = []
      if      (target.type === 'ashby')      batch = await scrapeAshby(target)
      else if (target.type === 'greenhouse') batch = await scrapeGreenhouse(target)
      else                                   batch = await scrapeCustomPage(target)

      leads.push(...batch)
      console.log(`[curated-scraper] ${target.name}: ${batch.length} lead(s)`)

    } catch (err) {
      const msg = `${target.name}: ${err instanceof Error ? err.message : String(err)}`
      console.error(`[curated-scraper] ERROR ${msg}`)
      errors.push(msg)

      // Always store a placeholder so Sam knows the scrape failed
      const careerUrl =
        target.type === 'custom'       ? target.url :
        target.type === 'ashby'        ? `https://jobs.ashbyhq.com/${target.slug}` :
                                         `https://boards.greenhouse.io/${target.slug}`

      const src: JobLead['source'] =
        target.type === 'ashby'        ? 'target-ashby' :
        target.type === 'greenhouse'   ? 'target-greenhouse' :
                                         'target-custom'

      leads.push(manualReviewPlaceholder(
        target.name, careerUrl,
        `Scrape failed: ${msg}. Visit ${careerUrl} directly.`,
        src, 'error',
      ))
    }
  }

  return { leads, errors }
}
