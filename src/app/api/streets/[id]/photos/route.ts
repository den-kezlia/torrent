import { z } from 'zod'
import { put } from '@vercel/blob'
import { prisma } from '@/server/db'

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const filename = (req.headers.get('x-filename') || '').trim()
  const contentType = req.headers.get('content-type') || 'application/octet-stream'
  if (!filename) return Response.json({ error: 'Missing x-filename header' }, { status: 400 })

  // Prefer client-provided GPS (from original EXIF) to avoid parsing large payloads on server
  let lng: number | undefined = (() => { const v = req.headers.get('x-gps-lng'); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined })()
  let lat: number | undefined = (() => { const v = req.headers.get('x-gps-lat'); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : undefined })()

  // Read body as Blob (works in edge/runtime) without keeping a giant ArrayBuffer copy longer than needed
  const body = await req.blob()

  // If GPS still missing and body is reasonably small, try EXIF parse (best-effort)
  if (lng == null || lat == null) {
    try {
      if (body.size < 8_000_000) { // 8MB guard
        const ab = await body.arrayBuffer()
        // @ts-ignore: optional dependency may not be present in type system until installed
        const exifr = (await import('exifr')).default as any
        const exif = await exifr.parse(new Uint8Array(ab), { gps: true }) as any
        if (exif && typeof exif.longitude === 'number' && typeof exif.latitude === 'number') {
          lng = lng ?? exif.longitude
          lat = lat ?? exif.latitude
        }
      }
    } catch {}
  }

  const blob = await put(`streets/${parsed.data.id}/${filename}`, body, {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN
  })

  const photo = await prisma.photo.create({
    // Cast to any until Prisma client is regenerated with lng/lat columns
    data: { streetId: parsed.data.id, url: blob.url, blobKey: blob.pathname, lng, lat } as any
  })
  return Response.json({ id: photo.id, url: photo.url })
}
