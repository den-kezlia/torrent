"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './rich-text-editor'

export function EditNote({ id, initial, streetId, onDone }: { id: string, initial: string, streetId: string, onDone?: () => void }) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function uploadImage(file: File): Promise<string> {
    const res = await fetch(`/api/streets/${streetId}/photos`, {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-filename': encodeURIComponent(file.name)
      },
      body: await file.arrayBuffer()
    })
    if (!res.ok) throw new Error('Upload failed')
    const json = await res.json()
    return json.url as string
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/notes/${id}/edit`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: value })
      })
      if (!res.ok) throw new Error('Save failed')
      router.refresh()
      onDone?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <RichTextEditor value={value} onChange={setValue} onUploadImage={uploadImage} />
      <div className="flex gap-2 justify-end">
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => onDone?.()} disabled={busy}>Cancel</button>
        <button className="rounded-md border px-3 py-2 text-sm" disabled={busy || !value.trim()}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
