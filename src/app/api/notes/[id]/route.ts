import { z } from 'zod'
import { prisma } from '@/server/db'
import { revalidatePath } from 'next/cache'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const note = await prisma.note.findUnique({ where: { id: parsed.data.id }, select: { id: true, streetId: true } })
  await prisma.note.delete({ where: { id: parsed.data.id } }).catch(() => null)
  try {
    if (note?.streetId) {
      revalidatePath(`/streets/${note.streetId}`)
      revalidatePath('/streets')
    }
  } catch {}
  return Response.json({ ok: true, streetId: note?.streetId || null })
}
