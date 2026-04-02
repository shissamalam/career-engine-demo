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
