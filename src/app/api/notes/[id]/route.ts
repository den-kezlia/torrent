import { z } from 'zod'
import { prisma } from '@/server/db'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function DELETE(_req: Request, ctx: any) {
  const parsed = paramsSchema.safeParse(ctx?.params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  await prisma.note.delete({ where: { id: parsed.data.id } }).catch(() => null)
  return Response.json({ ok: true })
}
