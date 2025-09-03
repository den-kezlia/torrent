import { z } from 'zod'
import { prisma } from '@/server/db'
import { revalidatePath } from 'next/cache'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({ content: z.string().min(1), tags: z.array(z.string()).default([]) })

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
  const note = await prisma.note.update({
    where: { id: parsed.data.id },
    data: { content: body.data.content, tags: body.data.tags }
  })
  try {
    revalidatePath(`/streets/${note.streetId}`)
    revalidatePath('/streets')
  } catch {}
  return Response.json({ ok: true })
}
