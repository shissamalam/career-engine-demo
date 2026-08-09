// ── Digest flood control ──────────────────────────────────────────────────────
// Presentation-layer only: ingestion and scoring store everything; this module
// decides what the digest SURFACES. Two passes, in order:
//   1. Near-duplicate collapse — same company + near-identical title (location
//      variants, "Sr."/"Senior" variants, scraper junk suffixes) → keep the
//      highest-scored instance, merge the other locations onto it.
//   2. Per-company cap — at most MAX_POSTINGS_PER_COMPANY entries per
//      normalized company, chosen by fit score. Everything dropped here is
//      flagged suppressed_flood in storage, never deleted.
// No LLM calls, no fuzzy-matching dependencies — deterministic string
// normalization only.

export interface DigestRow {
  id: number
  title: string
  company: string
  location: string | null
  fit_score: number | null
  [key: string]: unknown
}

export type DigestEntry<T extends DigestRow> = T & {
  other_locations: string[]
  collapsed_count: number
}

export interface SuppressionFooter {
  company: string   // display name of the kept entries
  shown: number
  scored: number    // postings for this company in the digest pool (post-collapse)
}

export interface DigestResult<T extends DigestRow> {
  entries: DigestEntry<T>[]
  footers: SuppressionFooter[]
  suppressedIds: number[]              // dropped by the per-company cap
  collapsedIds: Map<number, number>    // duplicate id → id of the kept instance
}

// ── Config (env-driven; changing a cap or alias requires no code change) ──────

const DEFAULT_MAX_PER_COMPANY = 2

export function maxPostingsPerCompany(): number {
  const raw = process.env.MAX_POSTINGS_PER_COMPANY
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PER_COMPANY
}

// Subsidiary/brand strings that must collapse into one company for the cap.
// Keys and values are compared post-normalizeCompanyBase (lowercase, no
// punctuation, no legal suffixes). Extend via the COMPANY_ALIASES env var —
// a JSON object merged over these defaults, e.g.
//   COMPANY_ALIASES='{"google llc":"google","deepmind":"google"}'
const DEFAULT_COMPANY_ALIASES: Record<string, string> = {
  'apple retail': 'apple',
  'apple computer': 'apple',
  'apple services': 'apple',
}

export function companyAliases(): Record<string, string> {
  let extra: Record<string, string> = {}
  const raw = process.env.COMPANY_ALIASES
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') extra[normalizeCompanyBase(k)] = normalizeCompanyBase(v)
        }
      }
    } catch {
      // Malformed COMPANY_ALIASES — ignore rather than break the digest.
      extra = {}
    }
  }
  return { ...DEFAULT_COMPANY_ALIASES, ...extra }
}

// ── Company normalization ─────────────────────────────────────────────────────

const LEGAL_SUFFIX_RE =
  /\s+(inc|incorporated|llc|llp|ltd|limited|corp|corporation|co|company|plc|gmbh|sa|ag|holdings)\.?$/

function normalizeCompanyBase(name: string): string {
  let n = name
    .toLowerCase()
    .replace(/[.,'’"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Strip repeatedly so "Apple Computer, Inc." → "apple computer".
  for (let prev = ''; prev !== n; ) {
    prev = n
    n = n.replace(LEGAL_SUFFIX_RE, '')
  }
  return n
}

export function normalizeCompany(name: string): string {
  const base = normalizeCompanyBase(name)
  return companyAliases()[base] ?? base
}

// ── Title normalization ───────────────────────────────────────────────────────

const SENIORITY_EXPANSIONS: [RegExp, string][] = [
  [/\bsr\b/g, 'senior'],
  [/\bjr\b/g, 'junior'],
  [/\bmgr\b/g, 'manager'],
  [/\bengr\b/g, 'engineer'],
  [/\bassoc\b/g, 'associate'],
]

export function normalizeTitle(title: string): string {
  let t = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [re, word] of SENIORITY_EXPANSIONS) t = t.replace(re, word)
  return t
}

// ── Pass 1: near-duplicate collapse ───────────────────────────────────────────
// Groups within one company: titles that normalize identically, OR where one
// normalized title is a prefix of another (the target-custom scraper emits the
// same req as "X", "X<Category><Date>", and "X<Category><Date>LocationAustinActions").
// The prefix rule requires a reasonably long stem so short generic titles
// don't swallow longer distinct ones.

const MIN_PREFIX_STEM = 12

// Comparison form: normalized title with spaces removed, so glued-word scraper
// variants ("Trade ServiceProduct…" vs "Trade Service Product…") still match.
function compactTitle(title: string): string {
  return normalizeTitle(title).replace(/ /g, '')
}

function scoreOf(r: DigestRow): number {
  return typeof r.fit_score === 'number' ? r.fit_score : -1
}

export function collapseNearDuplicates<T extends DigestRow>(
  rows: T[],
): { entries: DigestEntry<T>[]; collapsedIds: Map<number, number> } {
  const byCompany = new Map<string, T[]>()
  for (const r of rows) {
    const key = normalizeCompany(r.company)
    const list = byCompany.get(key)
    if (list) list.push(r)
    else byCompany.set(key, [r])
  }

  const kept: DigestEntry<T>[] = []
  const collapsedIds = new Map<number, number>()

  for (const list of Array.from(byCompany.values())) {
    // Shortest normalized title first, so the clean stem becomes the group
    // representative and junk-suffixed variants attach to it.
    const sorted = [...list].sort(
      (a, b) => compactTitle(a.title).length - compactTitle(b.title).length,
    )
    const groups: { stem: string; members: T[] }[] = []
    for (const row of sorted) {
      const norm = compactTitle(row.title)
      const group = groups.find(
        g => norm === g.stem || (g.stem.length >= MIN_PREFIX_STEM && norm.startsWith(g.stem)),
      )
      if (group) group.members.push(row)
      else groups.push({ stem: norm, members: [row] })
    }

    for (const g of groups) {
      const best = g.members.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a))
      const otherLocations: string[] = []
      for (const m of g.members) {
        if (m.id === best.id) continue
        collapsedIds.set(m.id, best.id)
        const loc = (m.location ?? '').trim()
        if (loc && loc !== (best.location ?? '').trim() && !otherLocations.includes(loc)) {
          otherLocations.push(loc)
        }
      }
      kept.push({ ...best, other_locations: otherLocations, collapsed_count: g.members.length - 1 })
    }
  }

  // Preserve the caller's ordering (fit score desc from SQL).
  const order = new Map(rows.map((r, i) => [r.id, i]))
  kept.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { entries: kept, collapsedIds }
}

// ── Pass 2: per-company cap ───────────────────────────────────────────────────

export function buildDigest<T extends DigestRow>(
  rows: T[],
  cap: number = maxPostingsPerCompany(),
): DigestResult<T> {
  const { entries: collapsed, collapsedIds } = collapseNearDuplicates(rows)

  const seen = new Map<string, { shown: number; scored: number; display: string }>()
  const entries: DigestEntry<T>[] = []
  const suppressedIds: number[] = []

  for (const entry of collapsed) {
    const key = normalizeCompany(entry.company)
    let stat = seen.get(key)
    if (!stat) {
      stat = { shown: 0, scored: 0, display: entry.company }
      seen.set(key, stat)
    }
    stat.scored++
    if (stat.shown < cap) {
      stat.shown++
      entries.push(entry)
    } else {
      suppressedIds.push(entry.id)
    }
  }

  const footers: SuppressionFooter[] = []
  for (const stat of Array.from(seen.values())) {
    if (stat.scored > stat.shown) {
      footers.push({ company: stat.display, shown: stat.shown, scored: stat.scored })
    }
  }
  footers.sort((a, b) => b.scored - a.scored)

  return { entries, footers, suppressedIds, collapsedIds }
}
