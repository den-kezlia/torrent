import { z } from 'zod'
import { prisma } from '@/server/db'
import { del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const note = await prisma.note.findUnique({ where: { id: parsed.data.id }, select: { id: true, streetId: true } })
  // find photos linked to this note
  const photos = await prisma.photo.findMany({ where: { noteId: parsed.data.id } })
  // delete note first (cascade photo relation is nullable, but we explicitly remove blobs)
  await prisma.note.delete({ where: { id: parsed.data.id } }).catch(() => null)
  // delete blobs and photo records
  if (photos.length) {
    for (const p of photos) {
      try { await del(p.blobKey, { token: process.env.BLOB_READ_WRITE_TOKEN }) } catch {}
    }
    await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } })
  }
  try {
    if (note?.streetId) {
      revalidatePath(`/streets/${note.streetId}`)
      revalidatePath('/streets')
    }
  } catch {}
  return Response.json({ ok: true, streetId: note?.streetId || null })
}
