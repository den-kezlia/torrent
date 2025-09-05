"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './rich-text-editor'
import { extractGps, compressToUnderJpeg } from '@/lib/image'

export function EditNote({ id, initial, streetId, onDone, initialHasGeo = false }: { id: string, initial: string, streetId: string, onDone?: () => void, initialHasGeo?: boolean }) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [includeGeo, setIncludeGeo] = useState<boolean>(initialHasGeo)
  const router = useRouter()

  async function uploadImage(file: File): Promise<string> {
  const { lng, lat } = await extractGps(file)
  const jpeg = await compressToUnderJpeg(file, { targetBytes: 3 * 1024 * 1024, initialQuality: 0.9, minQuality: 0.6 })
    const filename = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg'
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
    if (!res.ok) throw new Error('Upload failed')
    const json = await res.json()
    return json.url as string
  }

  function getCurrentPosition(opts?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, opts)
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    try {
      let geolocation: { lng: number; lat: number } | null | undefined
      if (includeGeo) {
        try {
          const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
          geolocation = { lng: pos.coords.longitude, lat: pos.coords.latitude }
        } catch {
          // If fetch fails while checked, don't clear existing geo; leave undefined to keep as-is
          geolocation = undefined
        }
      } else {
        // Explicitly clear geolocation when unchecked
        geolocation = null
      }
      const res = await fetch(`/api/notes/${id}/edit`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: value, geolocation })
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
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border border-foreground/20 bg-background text-foreground"
          checked={includeGeo}
          onChange={(e) => setIncludeGeo(e.target.checked)}
        />
        Use current location
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => onDone?.()} disabled={busy}>Cancel</button>
        <button className="rounded-md border px-3 py-2 text-sm" disabled={busy || !value.trim()}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
