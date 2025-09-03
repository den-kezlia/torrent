import { prisma } from '@/server/db'

export async function GET(req: Request) {
  // Pick a random street efficiently in Postgres
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Street" ORDER BY RANDOM() LIMIT 1`
  const id = rows[0]?.id
  const url = new URL(id ? `/streets/${id}` : '/streets', req.url)
  return Response.redirect(url, 302)
}
