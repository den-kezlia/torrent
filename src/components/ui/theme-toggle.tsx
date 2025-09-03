'use client'
import { useEffect, useState } from 'react'
import { Button } from './button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
  const html = document.documentElement
  // Initialize from localStorage if present, else system preference
  const stored = localStorage.getItem('theme')
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const initial = stored ? stored === 'dark' : prefersDark
  if (initial) html.classList.add('dark')
  else html.classList.remove('dark')
  setIsDark(initial)
  }, [])
  useEffect(() => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    if (isDark) html.classList.add('dark')
    else html.classList.remove('dark')
  try { localStorage.setItem('theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])
  return (
    <Button variant="ghost" size="sm" onClick={() => setIsDark((v) => !v)} aria-label={isDark ? 'Switch to light' : 'Switch to dark'} className="h-8 w-8 p-0 text-foreground">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
