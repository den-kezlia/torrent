// server component listing streets with filters & progress

import { prisma } from '@/server/db'
import Link from 'next/link'

type SearchParams = {
  search?: string
  status?: 'PLANNED' | 'IN_PROGRESS' | 'VISITED'
  hasPhotos?: string
  hasNotes?: string
  page?: string
}

type RawSearchParams = Record<string, string | string[] | undefined>

function toStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export default async function StreetsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams
  const sp: SearchParams = {
    search: toStr(raw.search),
    status: toStr(raw.status) as any,
    hasPhotos: toStr(raw.hasPhotos),
    hasNotes: toStr(raw.hasNotes),
    page: toStr(raw.page)
  }

  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const take = 20
  const skip = (page - 1) * take

  const where: any = {}
  if (sp.search) where.name = { contains: sp.search, mode: 'insensitive' }
  if (sp.hasPhotos === 'on') where.photos = { some: {} }
  if (sp.hasNotes === 'on') where.notes = { some: {} }

  const [itemsRaw, totalAll, allWithVisits] = await Promise.all([
    prisma.street.findMany({
      where,
      include: {
        _count: { select: { segments: true, photos: true, notes: true } },
        visits: { orderBy: { at: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take
    }),
    prisma.street.count({}),
    prisma.street.findMany({ include: { visits: { orderBy: { at: 'desc' }, take: 1 } } })
  ])

  let items = itemsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    segments: s._count.segments,
    photos: s._count.photos,
    notes: s._count.notes,
    lastStatus: s.visits[0]?.status ?? null
  }))

  if (sp.status) items = items.filter((i) => i.lastStatus === sp.status)

  const visitedCount = allWithVisits.filter((s) => s.visits[0]?.status === 'VISITED').length
  const totalCount = totalAll
  const progressPct = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0

  function buildQuery(next: Partial<SearchParams>) {
    const merged: Record<string, string> = {
      ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v != null) as any),
      ...Object.fromEntries(Object.entries(next).filter(([, v]) => v != null) as any)
    }
    return merged
  }

  return (
    <main className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
      <aside className="space-y-4">
        <h1 className="text-xl font-semibold">Streets</h1>
        <form className="space-y-3" role="search" aria-label="Filter streets" method="get">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="search">Search</label>
            <input id="search" name="search" defaultValue={sp.search ?? ''} className="w-full rounded-md border px-3 py-2" placeholder="Search streets" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ''} className="w-full rounded-md border px-3 py-2">
              <option value="">All</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="VISITED">Visited</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="hasPhotos" name="hasPhotos" type="checkbox" className="size-4" defaultChecked={sp.hasPhotos === 'on'} />
            <label htmlFor="hasPhotos" className="text-sm">Has photos</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="hasNotes" name="hasNotes" type="checkbox" className="size-4" defaultChecked={sp.hasNotes === 'on'} />
            <label htmlFor="hasNotes" className="text-sm">Has notes</label>
          </div>
          <div>
            <button className="inline-flex items-center rounded-md border px-3 py-2 text-sm" type="submit">Apply</button>
          </div>
        </form>

        <div className="pt-2">
          <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{visitedCount}/{totalCount} ({progressPct}%)</span>
          </div>
          <progress className="w-full h-2 [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary rounded" value={Number(visitedCount)} max={Number(Math.max(1, totalCount))} aria-label="Visited progress" />
        </div>
      </aside>
      <section className="space-y-4">
        <div className="flex items-center gap-4 border-b">
          <button className="px-3 py-2 border-b-2 border-transparent data-[active=true]:border-primary" data-active>
            List
          </button>
          <Link className="px-3 py-2 text-muted-foreground hover:text-foreground" href="/map">Map</Link>
        </div>
        <div role="region" aria-label="Streets list" className="grid gap-3">
          {items.map((s) => (
            <Link key={s.id} href={`/streets/${s.id}`} className="group rounded-xl border p-4 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
              <div className="flex items-center justify-between">
                <div className="font-medium group-hover:underline">{s.name}</div>
                <span className="text-xs rounded bg-muted px-2 py-0.5">{s.lastStatus ?? '—'}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">{s.segments} segments • {s.photos} photos • {s.notes} notes</div>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Link
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            href={{ pathname: '/streets', query: buildQuery({ page: String(Math.max(1, page - 1)) }) }}
            aria-disabled={page === 1}
          >
            Previous
          </Link>
          <div className="text-sm text-muted-foreground">Page {page}</div>
          <Link
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            href={{ pathname: '/streets', query: buildQuery({ page: String(page + 1) }) }}
          >
            Next
          </Link>
        </div>
      </section>
    </main>
  )
}
