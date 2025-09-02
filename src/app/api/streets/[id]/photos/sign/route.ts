import { z } from 'zod'
import { put } from '@vercel/blob'
import { prisma } from '@/server/db'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({ filename: z.string().min(1), contentType: z.string().min(1) })

export async function POST(req: Request, ctx: any) {
  const parsed = paramsSchema.safeParse(ctx?.params)
  if (!parsed.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const json = await req.json().catch(() => null)
  const body = bodySchema.safeParse(json)
  if (!body.success) return Response.json({ error: 'Invalid body' }, { status: 400 })

  // Signed direct upload (server receives the file for simplicity in this scaffold)
  // For true signed client uploads, switch to createUploadUrl from @vercel/blob when available.
  const keyPrefix = `streets/${parsed.data.id}/`
  const blob = await put(keyPrefix + body.data.filename, new Blob([]), {
    access: 'public',
    contentType: body.data.contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN
  })

  // Persist photo metadata placeholder (no width/height at this step)
  await prisma.photo.create({
    data: { streetId: parsed.data.id, url: blob.url, blobKey: blob.pathname }
  })
  return Response.json({ url: blob.url })
}
