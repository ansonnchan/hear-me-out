import type { Metadata } from 'next'
import '@/styles/globals.css'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'vent.ai',
  description: 'Same thought, different lens.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
