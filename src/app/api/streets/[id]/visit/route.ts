import { z } from 'zod'
import { prisma } from '@/server/db'

const paramsSchema = z.object({ id: z.string().min(1) })
const bodySchema = z.object({ status: z.enum(['PLANNED', 'IN_PROGRESS', 'VISITED']) })

export async function PATCH(req: Request, ctx: any) {
  const parsedParams = paramsSchema.safeParse(ctx?.params)
  if (!parsedParams.success) return Response.json({ error: 'Invalid id' }, { status: 400 })
  const json = await req.json().catch(() => null)
  const parsedBody = bodySchema.safeParse(json)
  if (!parsedBody.success) return Response.json({ error: 'Invalid body' }, { status: 400 })
  // Create a new visit record (audit trail); lastStatus is derived by latest visit
  await prisma.visit.create({ data: { streetId: parsedParams.data.id, status: parsedBody.data.status } })
  return Response.json({ ok: true, status: parsedBody.data.status })
}
