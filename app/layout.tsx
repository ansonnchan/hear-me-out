import type { Metadata } from 'next'
import '@/styles/globals.css'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'hear me out',
  description: 'Say the whole thing. Hear it differently.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
