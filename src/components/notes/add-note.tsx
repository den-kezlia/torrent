"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './rich-text-editor'
import { Button } from '@/components/ui/button'

export function AddNote({ streetId }: { streetId: string }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [includeGeo, setIncludeGeo] = useState(false)
  const router = useRouter()

  function getCurrentPosition(opts?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, opts)
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    try {
      let geolocation: { lng: number; lat: number } | undefined
      if (includeGeo) {
        try {
          const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
          geolocation = { lng: pos.coords.longitude, lat: pos.coords.latitude }
        } catch {
          // ignore geo errors and continue without location
        }
      }
      await fetch(`/api/streets/${streetId}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: value, geolocation })
      })
      setValue('')
      setIncludeGeo(false)
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
  <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border border-foreground/20 bg-background text-foreground"
          checked={includeGeo}
          onChange={(e) => setIncludeGeo(e.target.checked)}
        />
  Use current location
      </label>
      <div className="flex justify-end">
        <Button variant="ghost" className="border border-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted" disabled={busy || !value.trim()}>
          {busy ? 'Adding…' : 'Add note'}
        </Button>
      </div>
    </form>
  )
}
