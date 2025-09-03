"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useMemo } from 'react'
import { cn } from '@/lib/utils'

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = useMemo(() => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }, [pathname, href])
  return (
    <Link
      href={href as any}
      className={cn(
        'inline-flex items-center rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'border border-foreground/20 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
