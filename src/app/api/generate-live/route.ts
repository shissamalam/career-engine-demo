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

SCORING INSTRUCTIONS — apply these before generating any output:

STEP 1 — LOCATION GATE:
Is this role on-site or hybrid AND located outside the Austin, TX metro area AND
does it not explicitly state remote work is available?
If YES to all three: set roleFit.score to 0 and roleFit.scoreLabel to
"Excluded - relocation required" and roleFit.summary to "Role requires relocation
outside Austin TX. Sam will not relocate. Hard filter applied." Still generate the
full JSON structure but reflect the disqualification throughout.

STEP 2 — Score 0-100 using this rubric (only if role passed Step 1).
Add up points across all 6 categories:

ROLE TYPE FIT (30 pts max):
25-30 = GTM Ops, RevOps, BizOps, AI Implementation with build ownership,
        AI vibe coding/prompt engineering, Founding PM
15-24 = Product Ops, Chief of Staff, ops-heavy with some build component
5-14  = Mixed role with sales component or heavy client management
0-4   = AE, BD, SWE, pure PM, people manager without build

COMPANY STAGE & SIZE (20 pts max):
17-20 = Seed/Series A, sub-50 people, strong technical founder
12-16 = Series B, 50-100 people, lean team
6-11  = Series B/C, 100-200 people
0-5   = 200+ people, enterprise, or pre-product with no traction

REMOTE / LOCATION (15 pts max):
15    = Fully remote, no travel requirement
10-14 = Remote-first with optional Austin travel
5-9   = Hybrid Austin-based
0-4   = Any relocation requirement or in-office mandate outside Austin

COMPENSATION SIGNAL (15 pts max):
13-15 = $180K+ base stated or strongly implied by stage and seniority
9-12  = $150-180K range or strong equity offset
4-8   = $120-150K with compelling equity
0-3   = Below $120K or unclear with no equity signal

BUILD OWNERSHIP (10 pts max):
9-10  = Role explicitly owns building systems or infrastructure from zero
6-8   = Significant build component alongside ops work
3-5   = Some tooling/process work but primarily executional
0-2   = Advisory, oversight, or pure management role

TEAM CALIBER SIGNALS (5 pts max):
5     = Technical founders, YC/tier-1 funded, verifiable high-hiring-bar signals
3-4   = Experienced founders, funded with traction
1-2   = Unknown founders, limited signal
0     = Red flags (high churn signals, chaotic JD)

Sum all categories for the final score. A genuine fit scores 85-100. A mediocre
fit scores 55-75. A poor fit scores below 45.

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

When assessing role fit:
- Factor in environment fit alongside skills match
- If the job description signals command-and-control leadership,
  advisory-only authority, or large bureaucratic culture, note
  this explicitly in the gaps section with severity "major"
- If the company signals builder culture, early stage, genuine
  collaboration, and execution authority, note this as a strength
- Sam's burnout came from building systems for a leader who
  would not implement them. A skills match without environment
  fit is not a strong match. Always assess both.
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
- Include FMVA certification in education: "M.Arch + B.S. Architecture, Washington State University | FMVA (CFI, April 2026)"
- Include the 16x expansion ($80K to $1.3M+) and $75M+ numbers in Partner role bullets
- Include the deal preservation story ($35M to $69M restructured to $40M, preserved $1.6M) if space permits
- If content does not fit 2 pages, cut Project Designer first, then abbreviate Project Manager, never cut the numbers
- Location is always Austin TX, never Georgetown TX
- Do NOT include a separate "AI Systems Developer" or "Tano Architecture" experience entry. All AI and systems-building work should be woven into bullets within the Clayton Korte Partner role (2020-2025) where relevant.
- Company name is always "Clayton Korte" for all experience entries. Never use "Tano Architecture" or "Tano Studio".
- Never use em dashes (—) anywhere in the resume or cover letter. Use commas, colons, or rewrite the sentence instead.
- Never mention BizBox in any output. If referencing self-built applications, use TanoBox or tanobuild.com only.

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
