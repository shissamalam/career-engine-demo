import { DEMO_OUTPUT } from '@/lib/demoContent'

// Demo mode: return pre-baked output after a realistic delay
// No API calls, no file writes, no data storage
export async function POST() {
  await new Promise(resolve => setTimeout(resolve, 1400))
  return Response.json({
    success: true,
    data: DEMO_OUTPUT,
    demo: true,
  })
}
