import JSZip from 'jszip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx'

// ── Shared constants ────────────────────────────────────────────────────────

const COPPER = 'C8843A'
const BLACK = '000000'
const GRAY = '666666'

// ── Resume helpers ───────────────────────────────────────────────────────────

function sectionLabel(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 0 },
    border: {
      bottom: { color: 'CCCCCC', space: 4, style: BorderStyle.SINGLE, size: 4 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: COPPER,
        size: 18,
        allCaps: true,
        characterSpacing: 40,
      }),
    ],
  })
}

function spacer(ptAfter = 120): Paragraph {
  return new Paragraph({ spacing: { after: ptAfter } })
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, space: 0, color: 'FFFFFF' }
}

// ── Cover letter helpers ─────────────────────────────────────────────────────

function clPara(text: string, opts: {
  bold?: boolean
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  spacingAfter?: number
  lineSpacing?: number
} = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacingAfter ?? 0, line: opts.lineSpacing },
    children: [
      new TextRun({ text, bold: opts.bold, size: 20, color: BLACK, font: 'Calibri' }),
    ],
  })
}

function blank(): Paragraph {
  return new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: '', size: 20, font: 'Calibri' })],
  })
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ExperienceEntry {
  company: string
  title: string
  dates: string
  bullets: string[]
}

interface ResumeData {
  targetTitle?: string
  summary: string
  experience: ExperienceEntry[]
  skills: string[]
  education: string
}

interface CoverLetterData {
  opening: string
  body: string
  close: string
}

interface Strength {
  title: string
  detail: string
}

interface Gap {
  title: string
  detail: string
  severity: string
}

interface RoleFitData {
  score: number
  scoreLabel: string
  summary: string
  strengths: Strength[]
  gaps: Gap[]
}

interface TalkingPoint {
  question: string
  approach: string
  keyMessage: string
}

interface SalaryData {
  postedRange: string
  marketContext: string
  recommendation: string
  negotiationNotes: string[]
  redFlags: string[]
}

// ── Document generators ──────────────────────────────────────────────────────

async function buildResumeBuffer(resume: ResumeData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'Sam Manning', bold: true, size: 48, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  if (resume.targetTitle) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: resume.targetTitle, size: 22, color: GRAY, font: 'Calibri' }),
        ],
      })
    )
  }

  children.push(
    new Paragraph({
      spacing: { after: 0 },
      border: {
        bottom: { color: 'DDDDDD', space: 8, style: BorderStyle.SINGLE, size: 4 },
      },
      children: [
        new TextRun({
          text: 'sjmanning@gmail.com  |  360-261-1531  |  linkedin.com/in/sjmanningtx  |  Austin, TX',
          size: 18,
          color: GRAY,
          font: 'Calibri',
        }),
      ],
    })
  )

  children.push(spacer(160))
  children.push(sectionLabel('Professional Summary'))
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 160, line: 276 },
      children: [
        new TextRun({ text: resume.summary, size: 20, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  children.push(sectionLabel('Experience'))
  children.push(spacer(80))

  for (const exp of resume.experience) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder(), bottom: noBorder(), left: noBorder(),
          right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder(),
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({ text: exp.company, bold: true, size: 20, color: BLACK, font: 'Calibri' }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0 },
                    children: [
                      new TextRun({ text: exp.dates, size: 18, color: GRAY, font: 'Calibri' }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )

    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: exp.title, italics: true, size: 20, color: BLACK, font: 'Calibri' }),
        ],
      })
    )

    for (const bullet of exp.bullets) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360, hanging: 180 },
          children: [
            new TextRun({ text: `\u2022  ${bullet}`, size: 20, color: BLACK, font: 'Calibri' }),
          ],
        })
      )
    }

    children.push(spacer(100))
  }

  children.push(sectionLabel('Skills'))
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 160 },
      children: [
        new TextRun({ text: resume.skills.join(', '), size: 20, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  children.push(sectionLabel('Education'))
  children.push(
    new Paragraph({
      spacing: { before: 120 },
      children: [
        new TextRun({ text: resume.education, size: 20, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 864, right: 864 } } },
      children,
    }],
  })

  return Packer.toBuffer(doc)
}

async function buildCoverLetterBuffer(coverLetter: CoverLetterData, companyName: string): Promise<Buffer> {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const children: Paragraph[] = [
    clPara(dateStr, { align: AlignmentType.RIGHT }),
    blank(),
    clPara('Hiring Team'),
    clPara(companyName, { bold: true }),
    blank(),
    clPara('Dear Hiring Team,'),
    blank(),
    clPara(coverLetter.opening, { lineSpacing: 336 }),
    blank(),
    clPara(coverLetter.body, { lineSpacing: 336 }),
    blank(),
    clPara(coverLetter.close, { lineSpacing: 336 }),
    blank(),
    clPara('Sincerely,'),
    blank(),
    clPara('Sam Manning', { bold: true }),
    clPara('sjmanning@gmail.com'),
    clPara('360-261-1531'),
  ]

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 864, right: 864 } } },
      children,
    }],
  })

  return Packer.toBuffer(doc)
}

// ── Text file builders ────────────────────────────────────────────────────────

function buildJobDescText(companyName: string, jobPosting: string): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return [
    'JOB DESCRIPTION',
    '===============',
    companyName,
    `Downloaded: ${today}`,
    '---------------',
    '',
    jobPosting,
  ].join('\n')
}

function buildRoleFitText(companyName: string, roleFit: RoleFitData): string {
  const lines: string[] = [
    'ROLE FIT ANALYSIS',
    '=================',
    `Company: ${companyName}`,
    `Score: ${roleFit.score}/100 — ${roleFit.scoreLabel}`,
    '',
    'SUMMARY',
    '-------',
    roleFit.summary,
    '',
    'STRENGTHS',
    '---------',
  ]

  for (const s of (roleFit.strengths ?? [])) {
    lines.push(s.title)
    lines.push(s.detail)
    lines.push('')
  }

  lines.push('AREAS TO ADDRESS')
  lines.push('----------------')

  for (const g of (roleFit.gaps ?? [])) {
    lines.push(`${g.title} (${g.severity})`)
    lines.push(g.detail)
    lines.push('')
  }

  return lines.join('\n')
}

function buildSalaryText(companyName: string, salary: SalaryData): string {
  const lines: string[] = [
    'SALARY BRIEF',
    '============',
    `Company: ${companyName}`,
    '',
    'POSTED RANGE',
    '------------',
    salary.postedRange,
    '',
    'MARKET CONTEXT',
    '--------------',
    salary.marketContext,
    '',
    'RECOMMENDATION',
    '--------------',
    salary.recommendation,
    '',
    'NEGOTIATION NOTES',
    '-----------------',
  ]

  ;(salary.negotiationNotes ?? []).forEach((note, i) => {
    lines.push(`${String(i + 1).padStart(2, '0')}. ${note}`)
  })

  lines.push('')
  lines.push('RED FLAGS')
  lines.push('---------')

  for (const flag of (salary.redFlags ?? [])) {
    lines.push(`- ${flag}`)
  }

  return lines.join('\n')
}

function buildInterviewText(companyName: string, talkingPoints: TalkingPoint[]): string {
  const lines: string[] = [
    'INTERVIEW PREPARATION',
    '=====================',
    `Company: ${companyName}`,
    '',
  ]

  for (const tp of (talkingPoints ?? [])) {
    lines.push(`Q: ${tp.question}`)
    lines.push('')
    lines.push('YOUR APPROACH')
    lines.push(tp.approach)
    lines.push('')
    lines.push('KEY MESSAGE')
    lines.push(tp.keyMessage)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const token = request.headers.get('X-Live-Token')
  if (token !== process.env.LIVE_MODE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    jobPosting,
    companyName,
    roleFit,
    talkingPoints,
    salaryBrief,
    resume,
    coverLetter,
  } = body as {
    jobPosting: string
    companyName: string
    roleFit: RoleFitData
    talkingPoints: TalkingPoint[]
    salaryBrief: SalaryData
    resume: ResumeData
    coverLetter: CoverLetterData
  }

  const company = companyName || 'company'

  try {
    // Build all 6 files concurrently where possible
    const [resumeBuffer, coverLetterBuffer] = await Promise.all([
      buildResumeBuffer(resume),
      buildCoverLetterBuffer(coverLetter, company),
    ])

    const jobDescText = buildJobDescText(company, jobPosting)
    const roleFitText = buildRoleFitText(company, roleFit)
    const salaryText = buildSalaryText(company, salaryBrief)
    const interviewText = buildInterviewText(company, talkingPoints)

    const folderName = company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const zip = new JSZip()
    zip.file('00-job-description.txt', jobDescText)
    zip.file('01-role-fit.txt', roleFitText)
    zip.file('02-salary-brief.txt', salaryText)
    zip.file('03-interview-prep.txt', interviewText)
    zip.file('04-resume.docx', resumeBuffer)
    zip.file('05-cover-letter.docx', coverLetterBuffer)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="sam-manning-${folderName}-package.zip"`,
      },
    })
  } catch (err) {
    console.error('[download/package] handler error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Package build failed' },
      { status: 500 }
    )
  }
}
