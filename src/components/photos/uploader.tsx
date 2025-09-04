"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractGps, resizeToJpeg } from '@/lib/image'

export function PhotoUploader({ streetId }: { streetId: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  // use shared helpers from '@/lib/image'

  async function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0]
    if (!f) return
    setBusy(true)
    try {
      // Extract GPS before resize (resizing strips EXIF)
      const { lng, lat } = await extractGps(f)
      // Resize to reasonable JPEG size
      const jpeg = await resizeToJpeg(f, { maxDim: 2048, quality: 0.82 })
      const filename = (f.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg'

      const res = await fetch(`/api/streets/${streetId}/photos`, {
        method: 'POST',
        headers: {
          'content-type': 'image/jpeg',
          'x-filename': encodeURIComponent(filename),
          ...(lng != null ? { 'x-gps-lng': String(lng) } : {}),
          ...(lat != null ? { 'x-gps-lat': String(lat) } : {})
        },
        body: jpeg
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
      <span className="sr-only">Upload photo</span>
  <button type="button" className="rounded-md border px-3 py-2 text-sm bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20" onClick={() => document.getElementById(`file-${streetId}`)?.click()} disabled={busy}>
        {busy ? 'Uploading…' : 'Choose file'}
      </button>
      <input id={`file-${streetId}`} type="file" onChange={onFileChange} disabled={busy} className="hidden" aria-label="Upload photo" />
    </label>
  )
}
