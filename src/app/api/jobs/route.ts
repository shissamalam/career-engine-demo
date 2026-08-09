import { NextRequest } from 'next/server'
import { getDb, initDb } from '@/lib/db'
import { buildDigest, maxPostingsPerCompany, type DigestRow } from '@/lib/digest'
import { persistDigestFlags } from '@/lib/digestFlags'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const token = request.headers.get('X-Live-Token')
  if (token !== process.env.LIVE_MODE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await initDb()
  const sql = getDb()

  // Optional ?days=N scopes the digest pool to recent postings — used for the
  // catch-up digest regeneration. Default pool is the all-time top 500.
  const daysParam = new URL(request.url).searchParams.get('days')
  const days = daysParam ? Math.max(1, Math.min(365, parseInt(daysParam, 10) || 0)) : null

  // Historical rows are preserved in the table, but excluded companies are
  // never surfaced (Clayton Korte under any title; Clayco direct-employee
  // conversions).
  const pool = days
    ? await sql`
        SELECT
          id, title, company, location, salary_display,
          url, fit_score, fit_label, fit_summary,
          date_found, status, description, lane
        FROM job_leads
        WHERE company !~* '\\yclayton\\s*korte\\y'
          AND company !~* '\\yclayco\\y'
          AND date_found >= NOW() - make_interval(days => ${days})
        ORDER BY fit_score DESC NULLS LAST, date_found DESC
        LIMIT 500
      `
    : await sql`
        SELECT
          id, title, company, location, salary_display,
          url, fit_score, fit_label, fit_summary,
          date_found, status, description, lane
        FROM job_leads
        WHERE company !~* '\\yclayton\\s*korte\\y'
          AND company !~* '\\yclayco\\y'
        ORDER BY fit_score DESC NULLS LAST, date_found DESC
        LIMIT 500
      `

  const digest = buildDigest(pool as unknown as DigestRow[])
  await persistDigestFlags(sql, digest)

  return Response.json({
    jobs: digest.entries.slice(0, 100),
    suppression: digest.footers,
    flood_control: {
      max_per_company: maxPostingsPerCompany(),
      pool_size: pool.length,
      suppressed: digest.suppressedIds.length,
      collapsed_duplicates: digest.collapsedIds.size,
      window_days: days,
      generated_at: new Date().toISOString(),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get('X-Live-Token')
  if (token !== process.env.LIVE_MODE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, status } = await request.json()
  const sql = getDb()

  await sql`
    UPDATE job_leads SET status = ${status} WHERE id = ${id}
  `

  return Response.json({ success: true })
}
