import { NextRequest } from 'next/server'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pageRes = await fetch('https://vibecodecareers.com/jobs/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  })
  const html = await pageRes.text()
  const parts = html.split('https://vibecodecareers.com/job/')

  const chunks = []
  for (let i = 1; i < Math.min(parts.length, 5); i++) {
    const part = parts[i]
    const slug = part.slice(0, part.indexOf('"'))
    const window = part.slice(0, 800)
    chunks.push({
      url: 'https://vibecodecareers.com/job/' + slug,
      hasRemote: /\bRemote\b/i.test(window),
      postedMatch: window.match(/Posted\s+(\d+)\s*(min|hr|day)/i)?.[0] || null,
      preview: window.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400),
    })
  }

  return Response.json({
    totalParts: parts.length,
    htmlLength: html.length,
    chunks,
  })
}
