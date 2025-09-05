"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './rich-text-editor'
import { Button } from '@/components/ui/button'
import { extractGps, compressToUnderJpeg } from '@/lib/image'

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
    // Resize without cropping and preserve GPS via headers
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
