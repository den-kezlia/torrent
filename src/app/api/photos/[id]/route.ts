import { z } from 'zod'
import { prisma } from '@/server/db'
import { del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const photo = await prisma.photo.findUnique({ where: { id: parsed.data.id } })
  if (!photo) return Response.json({ error: 'Not found' }, { status: 404 })
  if (photo.noteId) return Response.json({ error: 'Cannot delete a note photo here' }, { status: 400 })

  try { await del(photo.blobKey, { token: process.env.BLOB_READ_WRITE_TOKEN }) } catch {}
  await prisma.photo.delete({ where: { id: photo.id } })
  try {
    revalidatePath(`/streets/${photo.streetId}`)
    revalidatePath('/streets')
  } catch {}
  return Response.json({ ok: true })
}
