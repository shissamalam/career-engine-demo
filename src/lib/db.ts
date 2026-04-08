import { neon } from '@neondatabase/serverless'

export function getDb() {
  return neon(process.env.POSTGRES_URL!)
}

export async function initDb() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS job_leads (
      id SERIAL PRIMARY KEY,
      external_id TEXT UNIQUE,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_display TEXT,
      description TEXT,
      url TEXT NOT NULL,
      fit_score INTEGER,
      fit_label TEXT,
      fit_summary TEXT,
      date_found TIMESTAMP DEFAULT NOW(),
      status TEXT DEFAULT 'new'
    )
  `
}
