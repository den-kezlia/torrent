import { z } from 'zod'
import { prisma } from '@/server/db'
import { revalidatePath } from 'next/cache'

const bodySchema = z.object({
  content: z.string().min(1),
  tags: z.array(z.string()).default([])
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const id = params?.id
  if (!id) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const json = await req.json().catch(() => null)
  const parsedBody = bodySchema.safeParse(json)
  if (!parsedBody.success) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const note = await prisma.note.create({
    data: {
      streetId: id,
      content: parsedBody.data.content,
      tags: parsedBody.data.tags
    }
  })

  // Link any uploaded photos referenced in the note content to this note
  try {
    const urls = Array.from(new Set((parsedBody.data.content.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [])
      .map((m) => {
        const match = m.match(/!\[[^\]]*\]\(([^)]+)\)/)
        return match ? match[1] : null
      })
      .filter((u): u is string => !!u)))
    if (urls.length) {
      const photos = await prisma.photo.findMany({ where: { streetId: id, url: { in: urls } } })
      if (photos.length) {
        await prisma.photo.updateMany({ where: { id: { in: photos.map((p) => p.id) } }, data: { noteId: note.id } })
      }
    }
  } catch {}
  try {
    revalidatePath(`/streets/${id}`)
    revalidatePath('/streets')
  } catch {}
  return Response.json({ ok: true, id: note.id })
}

