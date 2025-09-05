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

// Compress to JPEG under targetBytes while preserving original dimensions (no cropping or resizing)
export async function compressToUnderJpeg(
  input: Blob,
  options?: { targetBytes?: number; initialQuality?: number; minQuality?: number }
): Promise<Blob> {
  const targetBytes = options?.targetBytes ?? 3 * 1024 * 1024 // 3MB
  const initialQuality = Math.min(0.95, Math.max(0.5, options?.initialQuality ?? 0.9))
  const minQuality = Math.min(initialQuality, Math.max(0.4, options?.minQuality ?? 0.6))

  // If already small and browser-displayable, keep original
  const type = (input as any).type as string | undefined
  const displayable = type && (type.includes('jpeg') || type.includes('png') || type.includes('webp'))
  if ((input as any).size <= targetBytes && displayable) return input

  // Decode at original size
  const bitmap = await (async () => {
    try { return await createImageBitmap(input) } catch { return undefined }
  })()
  let width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void
  if (bitmap) {
    width = bitmap.width
    height = bitmap.height
    draw = (ctx) => ctx.drawImage(bitmap, 0, 0, width, height)
  } else {
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

  // Draw at 1:1 (no resize)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas context')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  draw(ctx)

  // Try qualities until under target or we hit minQuality
  const qualities = [initialQuality, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, minQuality]
  let best: Blob | null = null
  for (const q of qualities) {
    if (q < minQuality) continue
    // eslint-disable-next-line no-await-in-loop
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', q))
    if (!blob) continue
    best = blob
    if (blob.size <= targetBytes) return blob
  }
  if (best) return best
  throw new Error('Failed to encode JPEG')
}
