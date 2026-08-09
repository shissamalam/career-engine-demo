import type { DigestResult, DigestRow } from '@/lib/digest'

// Persist the digest's flood-control decisions back to storage. Flags only —
// nothing is ever deleted, and re-running is idempotent (kept rows are
// un-flagged so a posting can resurface if scores or the cap change).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function persistDigestFlags(sql: any, digest: DigestResult<DigestRow>) {
  const keptIds = digest.entries.map(e => e.id)
  if (keptIds.length > 0) {
    await sql`
      UPDATE job_leads SET suppressed_flood = FALSE, duplicate_of = NULL
      WHERE id = ANY(${keptIds}) AND (suppressed_flood OR duplicate_of IS NOT NULL)
    `
  }
  if (digest.suppressedIds.length > 0) {
    await sql`
      UPDATE job_leads SET suppressed_flood = TRUE
      WHERE id = ANY(${digest.suppressedIds}) AND NOT suppressed_flood
    `
  }
  if (digest.collapsedIds.size > 0) {
    const pairs = Array.from(digest.collapsedIds, ([dup, kept]) => ({ dup, kept }))
    await sql`
      UPDATE job_leads AS j
      SET duplicate_of = (m.pair->>'kept')::int
      FROM jsonb_array_elements(${JSON.stringify(pairs)}::jsonb) AS m(pair)
      WHERE j.id = (m.pair->>'dup')::int
        AND j.duplicate_of IS DISTINCT FROM (m.pair->>'kept')::int
    `
  }
}
