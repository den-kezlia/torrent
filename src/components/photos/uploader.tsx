"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PhotoUploader({ streetId }: { streetId: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0]
    if (!f) return
    setBusy(true)
    try {
      const res = await fetch(`/api/streets/${streetId}/photos`, {
        method: 'POST',
        headers: {
          'content-type': f.type || 'application/octet-stream',
          'x-filename': encodeURIComponent(f.name)
        },
        body: await f.arrayBuffer()
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      router.refresh()
    } finally {
      setBusy(false)
      ev.currentTarget.value = ''
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="file" onChange={onFileChange} disabled={busy} aria-label="Upload photo" />
      {busy ? 'Uploading…' : 'Upload photo'}
    </label>
  )
}
