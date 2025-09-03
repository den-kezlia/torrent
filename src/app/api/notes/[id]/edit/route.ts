import { z } from 'zod'
import { prisma } from '@/server/db'
import { revalidatePath } from 'next/cache'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  geolocation: z
    .union([
      z.object({ lng: z.number(), lat: z.number() }),
      z.null()
    ])
    .optional()
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const note = await prisma.note.findUnique({ where: { id: parsed.data.id } })
  if (!note) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(note)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const json = await req.json().catch(() => null)
  const body = bodySchema.safeParse(json)
  if (!body.success) return Response.json({ error: 'Invalid body' }, { status: 400 })
  const geoPart = body.data.geolocation === undefined
    ? {} // leave as-is
    : body.data.geolocation === null
      ? { lng: null, lat: null } // clear
      : { lng: body.data.geolocation.lng, lat: body.data.geolocation.lat } // set
  const note = await prisma.note.update({
    where: { id: parsed.data.id },
    data: {
      content: body.data.content,
      tags: body.data.tags,
      ...geoPart
    }
  })
  // Link any uploaded photos referenced in the note content to this note
  try {
    const urls = Array.from(new Set((body.data.content.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [])
      .map((m) => {
        const match = m.match(/!\[[^\]]*\]\(([^)]+)\)/)
        return match ? match[1] : null
      })
      .filter((u): u is string => !!u)))
    if (urls.length) {
      const photos = await prisma.photo.findMany({ where: { streetId: note.streetId, url: { in: urls } } })
      if (photos.length) {
        await prisma.photo.updateMany({ where: { id: { in: photos.map((p) => p.id) } }, data: { noteId: note.id } as any })
      }
    }
  } catch {}
  try {
    revalidatePath(`/streets/${note.streetId}`)
    revalidatePath('/streets')
  } catch {}
  return Response.json({ ok: true })
}
