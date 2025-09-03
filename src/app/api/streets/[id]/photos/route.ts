import { z } from 'zod'
import { put } from '@vercel/blob'
import { prisma } from '@/server/db'

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({ id: z.string().min(1) })

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const filename = (req.headers.get('x-filename') || '').trim()
  const contentType = req.headers.get('content-type') || 'application/octet-stream'
  if (!filename) return Response.json({ error: 'Missing x-filename header' }, { status: 400 })

  const buf = await req.arrayBuffer()
  const blob = await put(`streets/${parsed.data.id}/${filename}`, new Blob([buf]), {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN
  })

  const photo = await prisma.photo.create({
    data: { streetId: parsed.data.id, url: blob.url, blobKey: blob.pathname }
  })
  return Response.json({ id: photo.id, url: photo.url })
}
