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

// ── Shared constants ─────────────────────────────────────────────────────────

const COPPER = 'C8843A'
const BLACK = '000000'
const GRAY = '666666'

// ── Helpers ──────────────────────────────────────────────────────────────────

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
        characterSpacing: 80,
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

// ── Types ────────────────────────────────────────────────────────────────────

interface ExperienceEntry {
  company: string
  title: string
  dates: string
  intro?: string
  bullets: string[]
}

interface ResumeData {
  targetTitle?: string
  summary: string
  experience: ExperienceEntry[]
  skills: string[]
  education: string
}

// ── Document generator ───────────────────────────────────────────────────────

async function buildResumeBuffer(resume: ResumeData): Promise<Buffer> {
  const LIGHT_GRAY = '888888'
  const children: (Paragraph | Table)[] = []

  // ── PAGE HEADER ──────────────────────────────────────────────────────────────

  // Name — 36pt bold
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'Sam Manning', bold: true, size: 72, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  // Subtitle — 11pt gray
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

  // Contact line
  children.push(
    new Paragraph({
      spacing: { after: 0 },
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

  // URL line with thin bottom rule
  children.push(
    new Paragraph({
      spacing: { after: 0 },
      border: {
        bottom: { color: 'DDDDDD', space: 6, style: BorderStyle.SINGLE, size: 4 },
      },
      children: [
        new TextRun({ text: 'tanobuild.com', size: 18, color: GRAY, font: 'Calibri' }),
      ],
    })
  )

  children.push(spacer(200))

  // ── METRICS CALLOUT ROW ───────────────────────────────────────────────────────

  const METRICS = [
    { number: '$75M+',      line1: 'Capital Programs Managed', line2: 'Simultaneously'  },
    { number: '16\u00d7',   line1: 'Account Expansion',        line2: '(Land & Expand)' },
    { number: '13 Yrs',     line1: 'Enterprise Relationship',  line2: 'Cycles'           },
    { number: '100%',       line1: 'Revenue Retained in',      line2: 'Volatile Deals'   },
  ]

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: noBorder(), bottom: noBorder(), left: noBorder(),
        right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder(),
      },
      rows: [
        new TableRow({
          children: METRICS.map(m =>
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: m.number, bold: true, size: 44, color: COPPER, font: 'Calibri' }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: m.line1, size: 16, color: LIGHT_GRAY, font: 'Calibri' }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [
                    new TextRun({ text: m.line2, size: 16, color: LIGHT_GRAY, font: 'Calibri' }),
                  ],
                }),
              ],
            })
          ),
        }),
      ],
    })
  )

  children.push(spacer(200))

  // ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────────

  children.push(sectionLabel('Executive Summary'))
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 160, line: 276 },
      children: [
        new TextRun({ text: resume.summary, size: 20, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  // ── CORE GTM COMPETENCIES ─────────────────────────────────────────────────────

  children.push(sectionLabel('Core GTM Competencies'))
  children.push(spacer(80))

  const skills = resume.skills ?? []
  const colSize = Math.ceil(skills.length / 3)
  const col1 = skills.slice(0, colSize)
  const col2 = skills.slice(colSize, colSize * 2)
  const col3 = skills.slice(colSize * 2)

  const makeSkillCell = (items: string[]) =>
    new TableCell({
      width: { size: 33, type: WidthType.PERCENTAGE },
      borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
      children: items.length > 0
        ? items.map(skill =>
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: `\u25B8 ${skill}`, size: 20, color: BLACK, font: 'Calibri' }),
              ],
            })
          )
        : [new Paragraph({ children: [new TextRun({ text: '', font: 'Calibri' })] })],
    })

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: noBorder(), bottom: noBorder(), left: noBorder(),
        right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder(),
      },
      rows: [
        new TableRow({
          children: [makeSkillCell(col1), makeSkillCell(col2), makeSkillCell(col3)],
        }),
      ],
    })
  )

  children.push(spacer(200))

  // ── PROFESSIONAL EXPERIENCE ───────────────────────────────────────────────────

  children.push(sectionLabel('Professional Experience'))
  children.push(spacer(80))

  for (const exp of (resume.experience ?? [])) {
    // Company (bold left) + dates (gray right)
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
                      new TextRun({ text: exp.company, bold: true, size: 22, color: BLACK, font: 'Calibri' }),
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
                      new TextRun({ text: exp.dates, size: 20, color: GRAY, font: 'Calibri' }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )

    // Job title — italic
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({ text: exp.title, italics: true, size: 20, color: BLACK, font: 'Calibri' }),
        ],
      })
    )

    // Intro paragraph — optional italic scope sentence
    if (exp.intro) {
      children.push(
        new Paragraph({
          spacing: { after: 120, line: 276 },
          children: [
            new TextRun({ text: exp.intro, italics: true, size: 20, color: '666666', font: 'Calibri' }),
          ],
        })
      )
    }

    const bullets = exp.bullets ?? []

    if (bullets.length >= 6) {
      // Classify bullets into thematic groups
      const revenueRe = /revenue|account|expansion|retention|client|pipeline|deal|sales|expand|grow|ARR|\$|contract|negotiat|close|preserve/i
      const systemsRe = /system|process|tool|platform|automat|deploy|docker|\bAI\b|build|develop|architect|infrastructure|tech|software|workflow|integrat|database|stack/i

      const revBullets: string[] = []
      const sysBullets: string[] = []
      const otherBullets: string[] = []

      for (const b of bullets) {
        if (revenueRe.test(b)) revBullets.push(b)
        else if (systemsRe.test(b)) sysBullets.push(b)
        else otherBullets.push(b)
      }

      const groups: { label: string; items: string[] }[] = []
      if (revBullets.length > 0) groups.push({ label: 'ENTERPRISE REVENUE EXPANSION', items: revBullets })
      if (sysBullets.length > 0) groups.push({ label: 'SYSTEMS & OPERATIONS BUILD',   items: sysBullets })

      // Distribute leftover bullets
      if (otherBullets.length > 0) {
        if (groups.length === 0) {
          groups.push({ label: 'ENTERPRISE REVENUE EXPANSION', items: otherBullets })
        } else if (otherBullets.length >= 2 && groups.length < 3) {
          groups.push({ label: 'LEADERSHIP & STRATEGY', items: otherBullets })
        } else {
          groups[0].items.push(...otherBullets)
        }
      }

      // Fallback: if single group still has 6+ bullets, split evenly
      if (groups.length === 1 && groups[0].items.length >= 6) {
        const half = Math.ceil(groups[0].items.length / 2)
        const second = groups[0].items.splice(half)
        groups.push({ label: 'SYSTEMS & OPERATIONS BUILD', items: second })
      }

      for (const group of groups) {
        children.push(
          new Paragraph({
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: group.label,
                size: 16,
                color: COPPER,
                allCaps: true,
                characterSpacing: 40,
                font: 'Calibri',
              }),
            ],
          })
        )
        for (const b of group.items) {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              indent: { left: 280, hanging: 180 },
              children: [
                new TextRun({ text: `\u25B8  ${b}`, size: 20, color: BLACK, font: 'Calibri' }),
              ],
            })
          )
        }
      }
    } else {
      // Fewer than 6 bullets — render directly, no sub-headers
      for (const b of bullets) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: 280, hanging: 180 },
            children: [
              new TextRun({ text: `\u25B8  ${b}`, size: 20, color: BLACK, font: 'Calibri' }),
            ],
          })
        )
      }
    }

    children.push(spacer(120))
  }

  // ── EDUCATION & CREDENTIALS ───────────────────────────────────────────────────

  children.push(sectionLabel('Education and Credentials'))
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 0 },
      children: [
        new TextRun({ text: resume.education ?? '', size: 20, color: BLACK, font: 'Calibri' }),
      ],
    })
  )

  // ── DOCUMENT ─────────────────────────────────────────────────────────────────

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
      },
      children,
    }],
  })

  return Packer.toBuffer(doc)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const token = request.headers.get('X-Live-Token')
  if (token !== process.env.LIVE_MODE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const resume = body.resume as ResumeData

  if (!resume) {
    return Response.json({ error: 'No resume data' }, { status: 400 })
  }

  try {
    const buffer = await buildResumeBuffer(resume)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="sam-manning-resume.docx"',
      },
    })
  } catch (err) {
    console.error('[download/resume] error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Resume build failed' },
      { status: 500 }
    )
  }
}
