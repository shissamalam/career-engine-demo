import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx'

const BLACK = '000000'

interface CoverLetterData {
  opening: string
  body: string
  close: string
}

function para(text: string, opts: {
  bold?: boolean
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  spacingAfter?: number
  lineSpacing?: number
} = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: {
      after: opts.spacingAfter ?? 0,
      line: opts.lineSpacing,
    },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: 20,
        color: BLACK,
        font: 'Calibri',
      }),
    ],
  })
}

function blank(): Paragraph {
  return new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: '', size: 20, font: 'Calibri' })],
  })
}

export async function POST(request: Request) {
  const token = request.headers.get('X-Live-Token')
  if (token !== process.env.LIVE_MODE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { coverLetter, companyName } = body as {
    coverLetter: CoverLetterData
    companyName?: string
  }

  if (!coverLetter) {
    return Response.json({ error: 'No cover letter data' }, { status: 400 })
  }

  const today = new Date(2026, 3, 6) // April 6, 2026
  const dateStr = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const children: Paragraph[] = [
    para(dateStr, { align: AlignmentType.RIGHT }),
    blank(),
    para('Hiring Team'),
    companyName ? para(companyName, { bold: true }) : blank(),
    blank(),
    para('Dear Hiring Team,'),
    blank(),
    para(coverLetter.opening, { lineSpacing: 336, spacingAfter: 0 }),
    blank(),
    para(coverLetter.body, { lineSpacing: 336, spacingAfter: 0 }),
    blank(),
    para(coverLetter.close, { lineSpacing: 336, spacingAfter: 0 }),
    blank(),
    para('Sincerely,'),
    blank(),
    para('Sam Manning', { bold: true }),
    para('sjmanning@gmail.com'),
    para('360-261-1531'),
  ]

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
      'Content-Disposition': 'attachment; filename="sam-manning-cover-letter.docx"',
    },
  })
}
