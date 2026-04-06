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
      max_tokens: 8000,
      system: DNA_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this job posting for Sam Manning and produce a complete career package.

JOB POSTING:
${jobPosting}

Return a JSON object with EXACTLY this structure — match every field name and type precisely:

{
  "roleFit": {
    "score": <integer 0-100>,
    "scoreLabel": "<one of: Poor match | Partial match | Good match | Strong match | Exceptional match>",
    "summary": "<2-3 sentences assessing overall fit>",
    "strengths": [
      {
        "title": "<strength title>",
        "detail": "<2-3 sentence explanation specific to Sam's background>"
      }
    ],
    "gaps": [
      {
        "title": "<gap title>",
        "detail": "<2-3 sentence explanation with framing advice>",
        "severity": "<one of: minor | moderate | major>"
      }
    ]
  },
  "talkingPoints": [
    {
      "question": "<likely interview question>",
      "approach": "<how to answer it using Sam's specific background>",
      "keyMessage": "<the one sentence that must land>"
    }
  ],
  "salaryBrief": {
    "postedRange": "<salary range as posted in the job description, or 'Not specified' if absent>",
    "marketContext": "<2-3 sentences on market rates for this role, level, and location>",
    "recommendation": "<specific target number and negotiation position>",
    "negotiationNotes": [
      "<specific negotiation tactic or data point>"
    ],
    "redFlags": [
      "<compensation red flag to watch for>"
    ]
  },
  "resume": {
    "targetTitle": "<role-specific professional title for this job, e.g. 'Director of Revenue Operations' or 'VP of Go-To-Market'>",
    "summary": "<2-3 sentence professional summary tailored to this specific role>",
    "experience": [
      {
        "company": "<company name>",
        "title": "<job title>",
        "dates": "<date range>",
        "bullets": [
          "<achievement bullet — specific, quantified where possible>",
          "<achievement bullet>",
          "<achievement bullet>"
        ]
      }
    ],
    "skills": ["<skill 1>", "<skill 2>", "<skill 3>"],
    "education": "<degree and institution>"
  },
  "coverLetter": {
    "opening": "<first paragraph — specific hook connecting Sam to this company and role>",
    "body": "<second paragraph — two strongest matching credentials with specific evidence>",
    "close": "<third paragraph — forward-looking close, confident, no filler>"
  }
}

CRITICAL RESUME RULES:
- Maximum 2 pages when rendered as a Word document
- Use exact dates: Partner 2020-2025, Project Architect 2014-2020, Project Manager 2011-2014, Project Designer 2010-2011 (only if fits)
- Use exact contact: sjmanning@gmail.com, 360-261-1531, linkedin.com/in/sjmanningtx, Austin TX
- Include FMVA certification in education: "M.Arch + B.S. Architecture, Washington State University | FMVA (CFI, in progress)"
- Include the 16x expansion ($80K to $1.3M+) and $75M+ numbers in Partner role bullets
- Include the deal preservation story ($35M to $69M restructured to $40M, preserved $1.6M) if space permits
- If content does not fit 2 pages, cut Project Designer first, then abbreviate Project Manager, never cut the numbers
- Location is always Austin TX, never Georgetown TX
- Include AI Systems Developer (2024-Present) as a separate experience entry

Requirements:
- Include 3-5 strengths, 1-3 gaps, 4-6 talking points, 3-5 negotiation notes, 2-4 red flags
- Be specific to Sam's actual background — no generic advice
- Return only valid JSON. No markdown fences, no preamble, no explanation.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

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
    return Response.json(
      { error: 'Generation failed', detail: String(error) },
      { status: 500 }
    )
  }
}
