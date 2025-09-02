import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { streetListItemSchema } from '@/server/types'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'VISITED']).optional(),
  hasPhotos: z.coerce.boolean().optional(),
  hasNotes: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  bbox: z
    .string()
    .regex(/^(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)$/)
    .optional()
})

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const parse = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parse.success) {
    return Response.json({ error: 'Invalid query', issues: parse.error.flatten() }, { status: 400 })
  }
  const { search, status, hasPhotos, hasNotes, bbox } = parse.data
  if (bbox) {
    // Return GeoJSON FeatureCollection of segments intersecting bbox
    const parts = bbox.split(',').map((n) => Number(n))
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      return Response.json({ error: 'Invalid bbox' }, { status: 400 })
    }
    const [minX, minY, maxX, maxY] = parts as [number, number, number, number]
    const segments = await prisma.streetSegment.findMany({
      select: {
        id: true,
        geometry: true,
        street: { select: { name: true, visits: { orderBy: { at: 'desc' }, take: 1 } } }
      }
    })
    const features = segments
      .filter((seg) => {
        const geom = seg.geometry as any
        if (!geom || geom.type !== 'LineString' || !Array.isArray(geom.coordinates)) return false
        let minLon = Infinity,
          minLat = Infinity,
          maxLon = -Infinity,
          maxLat = -Infinity
        for (const c of geom.coordinates as unknown[]) {
          if (!Array.isArray(c) || c.length < 2) continue
          const lon = Number((c as any)[0])
          const lat = Number((c as any)[1])
          if (Number.isNaN(lon) || Number.isNaN(lat)) continue
          if (lon < minLon) minLon = lon
          if (lat < minLat) minLat = lat
          if (lon > maxLon) maxLon = lon
          if (lat > maxLat) maxLat = lat
        }
        // AABB intersection test
        const intersects = !(maxLon < minX || maxX < minLon || maxLat < minY || maxY < minLat)
        return intersects
      })
      .map((seg) => {
        const geom = seg.geometry as any
        const lastStatus: string | null = seg.street.visits[0]?.status ?? null
        return {
          type: 'Feature',
          geometry: geom,
          properties: {
            id: seg.id,
            street: seg.street.name,
            status: lastStatus
          }
        }
      })
    return Response.json({ type: 'FeatureCollection', features })
  }
  const page = parse.data.page ?? 1
  const take = 20
  const skip = (page - 1) * take

  const where: any = {}
  if (search) where.name = { contains: search, mode: 'insensitive' }
  if (hasPhotos) where.photos = { some: {} }
  if (hasNotes) where.notes = { some: {} }

  // For status, use latest visit per street
  // We'll filter in JS after fetching necessary data due to aggregation requirements.
  const [itemsRaw, total] = await Promise.all([
    prisma.street.findMany({
      where,
      include: {
        _count: { select: { segments: true, photos: true, notes: true } },
        visits: { orderBy: { at: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take
    }),
    prisma.street.count({ where })
  ])

  let items = itemsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    segments: s._count.segments,
    photos: s._count.photos,
    notes: s._count.notes,
    lastStatus: s.visits[0]?.status ?? null,
    updatedAt: s.updatedAt.toISOString()
  }))

  if (status) items = items.filter((i) => i.lastStatus === status)

  // Validate output
  const parsedItems = items.map((i) => streetListItemSchema.parse(i))
  return Response.json({ items: parsedItems, page, total })
}
