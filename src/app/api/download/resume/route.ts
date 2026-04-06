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

const COPPER = 'C8843A'
const BLACK = '000000'
const GRAY = '666666'

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
        size: 18, // 9pt
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

  const children: (Paragraph | Table)[] = []

  // ── HEADER ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'Sam Manning',
          bold: true,
          size: 48, // 24pt
          color: BLACK,
          font: 'Calibri',
        }),
      ],
    })
  )

  if (resume.targetTitle) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: resume.targetTitle,
            size: 22, // 11pt
            color: GRAY,
            font: 'Calibri',
          }),
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
          size: 18, // 9pt
          color: GRAY,
          font: 'Calibri',
        }),
      ],
    })
  )

  children.push(spacer(160))

  // ── PROFESSIONAL SUMMARY ─────────────────────────────────────────────────
  children.push(sectionLabel('Professional Summary'))
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 160, line: 276 },
      children: [
        new TextRun({
          text: resume.summary,
          size: 20, // 10pt
          color: BLACK,
          font: 'Calibri',
        }),
      ],
    })
  )

  // ── EXPERIENCE ──────────────────────────────────────────────────────────
  children.push(sectionLabel('Experience'))
  children.push(spacer(80))

  for (const exp of resume.experience) {
    // Company | Dates table
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder(),
          bottom: noBorder(),
          left: noBorder(),
          right: noBorder(),
          insideHorizontal: noBorder(),
          insideVertical: noBorder(),
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                borders: {
                  top: noBorder(),
                  bottom: noBorder(),
                  left: noBorder(),
                  right: noBorder(),
                },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({
                        text: exp.company,
                        bold: true,
                        size: 20,
                        color: BLACK,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: {
                  top: noBorder(),
                  bottom: noBorder(),
                  left: noBorder(),
                  right: noBorder(),
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 0 },
                    children: [
                      new TextRun({
                        text: exp.dates,
                        size: 18,
                        color: GRAY,
                        font: 'Calibri',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )

    // Job title
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [
          new TextRun({
            text: exp.title,
            italics: true,
            size: 20,
            color: BLACK,
            font: 'Calibri',
          }),
        ],
      })
    )

    // Bullets
    for (const bullet of exp.bullets) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360, hanging: 180 },
          children: [
            new TextRun({
              text: `\u2022  ${bullet}`,
              size: 20,
              color: BLACK,
              font: 'Calibri',
            }),
          ],
        })
      )
    }

    children.push(spacer(100))
  }

  // ── SKILLS ───────────────────────────────────────────────────────────────
  children.push(sectionLabel('Skills'))
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 160 },
      children: [
        new TextRun({
          text: resume.skills.join(', '),
          size: 20,
          color: BLACK,
          font: 'Calibri',
        }),
      ],
    })
  )

  // ── EDUCATION ────────────────────────────────────────────────────────────
  children.push(sectionLabel('Education'))
  children.push(
    new Paragraph({
      spacing: { before: 120 },
      children: [
        new TextRun({
          text: resume.education,
          size: 20,
          color: BLACK,
          font: 'Calibri',
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 864,
              right: 864,
            },
          },
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const uint8 = new Uint8Array(buffer)

  return new Response(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="sam-manning-resume.docx"',
    },
  })
}
