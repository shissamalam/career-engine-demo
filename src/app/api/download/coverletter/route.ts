import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'

const BLACK = '000000'

interface CoverLetterData {
  opening: string
  body: string
  close: string
}

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

// ── Route handler ─────────────────────────────────────────────────────────────

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

  try {
    const buffer = await buildCoverLetterBuffer(coverLetter, companyName || 'company')

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="sam-manning-cover-letter.docx"',
      },
    })
  } catch (err) {
    console.error('[download/coverletter] error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Cover letter build failed' },
      { status: 500 }
    )
  }
}
