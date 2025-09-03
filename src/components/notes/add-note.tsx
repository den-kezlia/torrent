"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './rich-text-editor'
import { Button } from '@/components/ui/button'

export function AddNote({ streetId }: { streetId: string }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    try {
      await fetch(`/api/streets/${streetId}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: value })
      })
      setValue('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function uploadImage(file: File): Promise<string> {
    // Reuse photos API for storage. We upload and get a public URL back.
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

  return (
    <form className="space-y-2" onSubmit={submit} aria-label="Add a note">
      <RichTextEditor value={value} onChange={setValue} onUploadImage={uploadImage} placeholder="Write a note… Use toolbar for headings, lists, images." />
      <div className="flex justify-end">
        <Button variant="ghost" className="border border-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted" disabled={busy || !value.trim()}>
          {busy ? 'Adding…' : 'Add note'}
        </Button>
      </div>
    </form>
  )
}
