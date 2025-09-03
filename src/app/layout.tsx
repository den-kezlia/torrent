import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Providers } from './providers'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NavLink } from '@/components/ui/nav-link'

export const metadata: Metadata = {
  title: 'Torrent Streets',
  description: 'Track visited streets in Torrent, Valencia.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
    <body>
        {/* Early theme boot to avoid FOUC and resets on reload */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');var d=(t==='dark')||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;d?e.classList.add('dark'):e.classList.remove('dark');}catch(e){}`
          }}
        />
        <Providers>
      <header className="sticky top-0 z-40 border-b bg-background">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <Link href="/streets" className="font-semibold">Torrent Streets</Link>
              <nav className="flex items-center gap-2 text-sm">
                <NavLink href="/streets">Streets</NavLink>
                <NavLink href="/map">Map</NavLink>
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
