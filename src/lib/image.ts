// Shared image helpers: EXIF GPS extraction and non-cropping resize to JPEG

export async function extractGps(file: File): Promise<{ lng?: number; lat?: number }> {
  try {
    const { default: exifr } = (await import('exifr')) as any
    const exif = await exifr.parse(file, { gps: true })
    const lng = typeof exif?.longitude === 'number' ? exif.longitude : undefined
    const lat = typeof exif?.latitude === 'number' ? exif.latitude : undefined
    return { lng, lat }
  } catch {
    return {}
  }
}

export async function resizeToJpeg(input: Blob, opts?: { maxDim?: number; quality?: number }): Promise<Blob> {
  const maxDim = opts?.maxDim ?? 2048
  const quality = opts?.quality ?? 0.8
  // Try createImageBitmap for performance; fallback to Image
  const bitmap = await (async () => {
    try {
      return await createImageBitmap(input)
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
      fr.readAsDataURL(input)
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
  // Scale preserving aspect ratio; no cropping
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
