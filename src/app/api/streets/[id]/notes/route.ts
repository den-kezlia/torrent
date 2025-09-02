import { z } from 'zod'
import { prisma } from '@/server/db'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({ content: z.string().min(1), tags: z.array(z.string()).default([]) })

export async function POST(req: Request, ctx: any) {
  const parsedParams = paramsSchema.safeParse(ctx?.params)
  if (!parsedParams.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const json = await req.json().catch(() => null)
  const parsedBody = bodySchema.safeParse(json)
  if (!parsedBody.success) return Response.json({ error: 'Invalid body' }, { status: 400 })
  const note = await prisma.note.create({
    data: {
      streetId: parsedParams.data.id,
      content: parsedBody.data.content,
      tags: parsedBody.data.tags
    }
  })
  return Response.json({ ok: true, id: note.id })
}
