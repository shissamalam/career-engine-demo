import Anthropic from '@anthropic-ai/sdk'
import { DNA_PROMPT } from '@/lib/dna'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 503 })
  }

  const token = request.headers.get('X-Live-Token')
  if (token !== process.env.LIVE_MODE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobPosting } = await request.json()
  if (!jobPosting?.trim()) {
    return Response.json({ error: 'No job posting provided' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: DNA_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this job posting and produce a complete career package.

JOB POSTING:
${jobPosting}

Return a JSON object with exactly this structure:
{
  "roleFit": {
    "score": <number 0-100>,
    "summary": "<2-3 sentence assessment>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "gaps": ["<gap 1>", "<gap 2>"]
  },
  "talkingPoints": [
    {
      "theme": "<theme name>",
      "point": "<the talking point>",
      "evidence": "<specific evidence from Sam's background>"
    }
  ],
  "salaryBrief": {
    "range": "<salary range>",
    "target": "<target number>",
    "rationale": "<2-3 sentences on positioning>",
    "tactics": ["<tactic 1>", "<tactic 2>", "<tactic 3>"]
  }
}

Return only valid JSON. No markdown fences, no preamble, no explanation.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Strip markdown fences if present
    const cleaned = content.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    return Response.json({
      success: true,
      data: parsed,
      demo: false,
    })
  } catch (error) {
    console.error('Live generation error:', error)
    // Return the actual error message so we can debug
    return Response.json(
      { error: 'Generation failed', detail: String(error) },
      { status: 500 }
    )
  }
}
