import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Providers } from './providers'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export const metadata: Metadata = {
  title: 'Torrent Streets',
  description: 'Track visited streets in Torrent, Valencia.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <Link href="/streets" className="font-semibold">Torrent Streets</Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/streets" className="hover:underline">Streets</Link>
                <Link href="/map" className="hover:underline">Map</Link>
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-4">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
