import { z } from 'zod'
import { prisma } from '@/server/db'
import { streetDetailSchema } from '@/server/types'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const s = await prisma.street.findUnique({
    where: { id: parsed.data.id },
    include: {
      segments: { orderBy: { updatedAt: 'desc' } },
  photos: true,
      notes: { orderBy: { createdAt: 'desc' } },
      visits: { orderBy: { at: 'desc' }, take: 1 }
    }
  })
  if (!s) return Response.json({ error: 'Not found' }, { status: 404 })
  const out = streetDetailSchema.parse({
    id: s.id,
    name: s.name,
    osmId: s.osmId,
    geometry: s.geometry ?? null,
    segments: s.segments.map((g) => ({ id: g.id, osmId: g.osmId, geometry: g.geometry, updatedAt: g.updatedAt.toISOString() })),
    photos: s.photos.map((p) => ({
      id: p.id,
      url: p.url,
      createdAt: p.createdAt.toISOString(),
      width: p.width ?? null,
      height: p.height ?? null,
      noteId: (p as any).noteId ?? null,
      lng: (p as any).lng ?? null,
      lat: (p as any).lat ?? null
    })),
    notes: s.notes.map((n) => ({ id: n.id, content: n.content, tags: n.tags, createdAt: n.createdAt.toISOString() })),
    lastStatus: s.visits[0]?.status ?? null
  })
  return Response.json(out)
}
