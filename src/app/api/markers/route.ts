import { z } from 'zod'
import { prisma } from '@/server/db'

const querySchema = z.object({ bbox: z.string().min(3) })

function parseBbox(bbox: string) {
  const parts = bbox.split(',').map((n) => Number(n))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) throw new Error('Invalid bbox')
  const [minX, minY, maxX, maxY] = parts
  return { minX, minY, maxX, maxY }
}

function stripMarkdown(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, '')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/([*_]{1,3})([^*_]+)\1/g, '$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*([-*+]\s+|\d+\.\s+)/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({ bbox: url.searchParams.get('bbox') || '' })
  if (!parsed.success) return Response.json({ error: 'Missing bbox' }, { status: 400 })
  let bounds
  try { bounds = parseBbox(parsed.data.bbox) } catch { return Response.json({ error: 'Invalid bbox' }, { status: 400 }) }

  const { minX, minY, maxX, maxY } = bounds

  // Fetch via raw SQL to avoid client typing lag on new columns
  const photos = await prisma.$queryRaw<Array<{ id: string; url: string; lng: number; lat: number; noteId: string | null; streetId: string; createdAt: Date }>>`
    SELECT id, url, lng, lat, "noteId", "streetId", "createdAt"
    FROM "Photo"
    WHERE lng IS NOT NULL AND lat IS NOT NULL
      AND lng BETWEEN ${minX} AND ${maxX}
      AND lat BETWEEN ${minY} AND ${maxY}
  `
  const notes = await prisma.$queryRaw<Array<{ id: string; content: string; lng: number; lat: number; streetId: string }>>`
    SELECT id, content, lng, lat, "streetId"
    FROM "Note"
    WHERE lng IS NOT NULL AND lat IS NOT NULL
      AND lng BETWEEN ${minX} AND ${maxX}
      AND lat BETWEEN ${minY} AND ${maxY}
  `

  const noteIdsWithGeo = new Set(notes.map((n) => n.id))
  // For each note, pick earliest photo (if any), regardless of photo geotagging
  const firstPhotoByNote = new Map<string, { url: string; createdAt: Date }>()
  if (noteIdsWithGeo.size) {
    const ids = Array.from(noteIdsWithGeo)
    const params = ids.map((_, i) => `$${i + 1}`).join(',')
    const rows = await prisma.$queryRawUnsafe<Array<{ noteId: string; url: string; createdAt: Date }>>(
      `SELECT DISTINCT ON ("noteId") "noteId", url, "createdAt"
       FROM "Photo"
       WHERE "noteId" IN (${params})
       ORDER BY "noteId", "createdAt" ASC`,
      ...ids
    )
    for (const r of rows) firstPhotoByNote.set(r.noteId, { url: r.url, createdAt: r.createdAt })
  }
  // Exclude photos that belong to notes with geolocation
  const photosRemaining = photos.filter((p) => !p.noteId || !noteIdsWithGeo.has(p.noteId))
  // Fetch note content for remaining photos that have a noteId (notes without geolocation)
  let noteTextById = new Map<string, string>()
  const noteIdsForPhotos = Array.from(new Set(photosRemaining.map((p) => p.noteId).filter((v): v is string => !!v)))
  if (noteIdsForPhotos.length) {
    // Build a parameterized list for IN clause
    const params = noteIdsForPhotos.map((_, i) => `$${i + 1}`).join(',')
    const photoNotes = await prisma.$queryRawUnsafe<Array<{ id: string; content: string }>>(
      `SELECT id, content FROM "Note" WHERE id IN (${params})`,
      ...noteIdsForPhotos
    )
    for (const n of photoNotes) {
      const text = stripMarkdown(n.content).slice(0, 120)
      if (text) noteTextById.set(n.id, text)
    }
  }

  const photoMarkers = photosRemaining.map((p) => ({ id: p.id, url: p.url, lng: p.lng, lat: p.lat, text: p.noteId ? noteTextById.get(p.noteId) : undefined, streetId: p.streetId, noteId: p.noteId ?? undefined }))
  const noteMarkers = notes.map((n) => ({ id: n.id, text: stripMarkdown(n.content).slice(0, 120), lng: n.lng, lat: n.lat, url: firstPhotoByNote.get(n.id)?.url, streetId: n.streetId }))

  return Response.json({ photos: photoMarkers, notes: noteMarkers })
}
