import { z } from 'zod'
import { importStreets } from '@/server/importer'

const bodySchema = z.object({ boundary: z.string().default('Torrent, Valencia') })

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json ?? {})
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 })
  const res = await importStreets(parsed.data.boundary)
  return Response.json({ ok: true, ...res })
}
