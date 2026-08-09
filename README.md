# Career Engine

AI-powered job application generator. Paste a job description, get a tailored resume, cover letter, fit analysis, and interview talking points — all generated using your personal DNA prompt.

## Setup

1. **Clone / copy to your server:**
   ```bash
   cd ~/career-engine
   ```

2. **Create your `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Anthropic API key
   ```

3. **Replace `dna.txt`** with your personal DNA prompt file. This file is used as the system prompt for all Anthropic API calls.

## Digest flood control

The `/jobs` digest (both the curated-targets list and the all-leads list) applies
presentation-layer flood control. Ingestion and scoring store everything;
suppressed rows are flagged in `job_leads` (`suppressed_flood`, `duplicate_of`),
never deleted.

Env vars (no code change needed):

- `MAX_POSTINGS_PER_COMPANY` — max digest entries per normalized company,
  chosen by fit score. Default: `2`.
- `COMPANY_ALIASES` — JSON object mapping subsidiary/brand names onto one
  company for the cap, merged over built-in defaults (Apple Retail / Apple
  Computer / Apple Services → Apple are pre-seeded). Example:
  `COMPANY_ALIASES='{"google llc":"google","deepmind":"google"}'`

When a company is capped the digest shows a footer line, e.g.
`Apple: 2 shown of 47 scored`, so a genuine hiring surge stays visible.
Near-identical reqs (same role across locations, junk-suffixed title variants)
are collapsed into the highest-scored instance before the cap, with the other
locations listed on that entry. `GET /api/jobs?days=7` regenerates the digest
over a recent window only.

## Run locally (development)

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Deploy to NucBox (Docker)

```bash
cd ~/career-engine
docker compose up -d --build
```

The app will be available at **http://career.local:3000** (configure `career.local` in your DNS or `/etc/hosts`).

## Update dna.txt

The `dna.txt` file is bind-mounted into the container. To update it:

1. Edit `~/career-engine/dna.txt` on the host
2. The change takes effect on the next API call — no rebuild or restart needed

To update the application code itself, rebuild:
```bash
docker compose up -d --build
```

## Coexistence with other Docker services

This container runs on its own isolated `career-net` Docker bridge network. It has **no interaction** with any other Docker services on this host:

- Uses only port **3000** (not in the 8000–8010 range used by other services)
- Does not share Redis, Postgres, or any volumes with other containers
- Does not reference or join `trading-net` or any other Docker network
- `restart: unless-stopped` is scoped only to the `career-engine` service

## Tech stack

- Next.js 14 (App Router, TypeScript, standalone output)
- Anthropic SDK (claude-sonnet-4-5)
- docx npm package for Word document generation
- Tailwind CSS
- Docker (multi-stage build, node:20-alpine)
