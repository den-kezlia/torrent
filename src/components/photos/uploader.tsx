"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PhotoUploader({ streetId }: { streetId: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function extractGps(file: File): Promise<{ lng?: number; lat?: number }> {
    try {
      const { default: exifr } = await import('exifr') as any
      const exif = await exifr.parse(file, { gps: true })
      const lng = typeof exif?.longitude === 'number' ? exif.longitude : undefined
      const lat = typeof exif?.latitude === 'number' ? exif.latitude : undefined
      return { lng, lat }
    } catch {
      return {}
    }
  }

  async function resizeToJpeg(file: File, opts?: { maxDim?: number; quality?: number }): Promise<Blob> {
    const maxDim = opts?.maxDim ?? 2048
    const quality = opts?.quality ?? 0.8
    // Try createImageBitmap for performance; fallback to Image
    const bitmap = await (async () => {
      try {
        // Some formats (HEIC) may fail here in certain browsers
        return await createImageBitmap(file)
      } catch {
        return undefined
      }
    })()
    let width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void
    if (bitmap) {
      width = bitmap.width
      height = bitmap.height
      draw = (ctx) => ctx.drawImage(bitmap, 0, 0, width, height)
    } else {
      // Fallback decode via Image element
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onerror = () => reject(fr.error)
        fr.onload = () => resolve(String(fr.result))
        fr.readAsDataURL(file)
      })
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('Image decode failed'))
        i.src = dataUrl
      })
      width = img.naturalWidth
      height = img.naturalHeight
      draw = (ctx) => ctx.drawImage(img, 0, 0, width, height)
    }
    // Scale preserving aspect ratio
    const scale = Math.min(1, maxDim / Math.max(width, height))
    const outW = Math.max(1, Math.round(width * scale))
    const outH = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No canvas context')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    draw(ctx)
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Failed to encode JPEG')
    return blob
  }

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
