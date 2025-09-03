'use client'
import { useEffect, useState } from 'react'
import { Button } from './button'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    setIsDark(html.classList.contains('dark'))
  }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    if (isDark) html.classList.add('dark')
    else html.classList.remove('dark')
  }, [isDark])
  return (
    <Button variant="outline" size="sm" onClick={() => setIsDark((v) => !v)} aria-label="Toggle theme">
      {isDark ? 'Light' : 'Dark'}
    </Button>
  )
}
