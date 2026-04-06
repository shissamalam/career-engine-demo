import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Career Engine — Demo',
  description: 'AI-powered career package generator. Demo mode with pre-generated output.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
        {children}
      </body>
    </html>
  )
}
