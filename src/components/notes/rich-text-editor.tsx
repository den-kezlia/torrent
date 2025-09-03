"use client"
import { useCallback, useRef, useState } from 'react'

type RichTextValue = string // markdown string

export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  placeholder
}: {
  value: RichTextValue
  onChange: (v: RichTextValue) => void
  onUploadImage?: (file: File) => Promise<string>
  placeholder?: string
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [busy, setBusy] = useState(false)

  const surround = useCallback((prefix: string, suffix: string = prefix) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const before = value.slice(0, start)
    const sel = value.slice(start, end)
    const after = value.slice(end)
    const next = `${before}${prefix}${sel || 'text'}${suffix}${after}`
    onChange(next)
    requestAnimationFrame(() => {
      const pos = (before + prefix + (sel || 'text') + suffix).length
      ta.setSelectionRange(pos, pos)
      ta.focus()
    })
  }, [value, onChange])

  const makeList = useCallback((ordered = false) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const before = value.slice(0, start)
    const sel = value.slice(start, end) || 'item one\nitem two'
    const after = value.slice(end)
    const lines = sel.split(/\n/)
    const nextSel = lines
      .map((l, i) => ordered ? `${i + 1}. ${l.replace(/^\s*([*-]|\d+\.)\s*/, '')}` : `- ${l.replace(/^\s*([*-]|\d+\.)\s*/, '')}`)
      .join('\n')
    const next = `${before}${nextSel}${after}`
    onChange(next)
    requestAnimationFrame(() => {
      const pos = (before + nextSel).length
      ta.setSelectionRange(pos, pos)
      ta.focus()
    })
  }, [value, onChange])

  const insertImage = useCallback(async (file: File) => {
    if (!onUploadImage) return
    setBusy(true)
    try {
      const url = await onUploadImage(file)
      const ta = taRef.current
      if (!ta) return
      const start = ta.selectionStart ?? 0
      const before = value.slice(0, start)
      const after = value.slice(start)
      const alt = file.name.replace(/\.[^.]+$/, '')
      const md = `![${alt}](${url})\n`
      onChange(before + md + after)
      requestAnimationFrame(() => {
        const pos = (before + md).length
        ta.setSelectionRange(pos, pos)
        ta.focus()
      })
    } finally {
      setBusy(false)
    }
  }, [value, onChange, onUploadImage])

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap gap-1 border-b bg-muted/50 p-2 text-sm">
        <button type="button" onClick={() => surround('**')} className="rounded border px-2 py-1">B</button>
        <button type="button" onClick={() => surround('*')} className="rounded border px-2 py-1 italic">I</button>
        <button type="button" onClick={() => surround('`')} className="rounded border px-2 py-1">Code</button>
        <button type="button" onClick={() => surround('# ', '')} className="rounded border px-2 py-1">H1</button>
        <button type="button" onClick={() => surround('## ', '')} className="rounded border px-2 py-1">H2</button>
        <button type="button" onClick={() => makeList(false)} className="rounded border px-2 py-1">• List</button>
        <button type="button" onClick={() => makeList(true)} className="rounded border px-2 py-1">1. List</button>
        <label className="ml-auto inline-flex items-center gap-2">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) insertImage(f)
            e.currentTarget.value = ''
          }} />
          <span className="rounded border px-2 py-1 cursor-pointer select-none">{busy ? 'Uploading…' : 'Image'}</span>
        </label>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-28 w-full resize-y rounded-b-md p-3 outline-none"
      />
    </div>
  )
}
