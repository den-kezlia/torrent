// server component listing streets with filters & progress

import { prisma } from '@/server/db'
import { Prisma } from '@prisma/client'
import Link from 'next/link'
import NearbyForm from './nearby-form'
import { prettyStatus, normalizeStatus } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'

type SearchParams = {
  search?: string
  status?: 'PLANNED' | 'IN_PROGRESS' | 'VISITED'
  hasPhotos?: string
  hasNotes?: string
  page?: string
  nearby?: string
  lat?: string
  lng?: string
  radius?: string
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
  page: toStr(raw.page),
  nearby: toStr((raw as any).nearby),
  lat: toStr((raw as any).lat),
  lng: toStr((raw as any).lng),
  radius: toStr((raw as any).radius)
  }

  const page = Math.max(1, Number(sp.page ?? 1) || 1)
// NearbyForm is a client component imported above

  const take = 20
  const skip = (page - 1) * take

  const where: any = {}
  if (sp.search) where.name = { contains: sp.search, mode: 'insensitive' }
  if (sp.hasPhotos === 'on') where.photos = { some: {} }
  if (sp.hasNotes === 'on') where.notes = { some: {} }

  // Nearby filter: compute intersecting streets by bbox approximation
  let nearbyIds: string[] | null = null
  if (sp.lat && sp.lng) {
    const lat = Number(sp.lat)
    const lng = Number(sp.lng)
    const radius = Number(sp.radius || '100')
    if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radius) && radius > 0) {
      const dLat = radius / 111320
      const cosLat = Math.cos((lat * Math.PI) / 180)
      const dLng = radius / (111320 * Math.max(0.1, cosLat))
      const minX = lng - dLng
      const maxX = lng + dLng
      const minY = lat - dLat
      const maxY = lat + dLat
      const segments = await withRetry(() =>
        prisma.streetSegment.findMany({
          select: { geometry: true, streetId: true }
        })
      )
      const idSet = new Set<string>()
      for (const seg of segments) {
        const geom = seg.geometry as any
        if (!geom || geom.type !== 'LineString' || !Array.isArray(geom.coordinates)) continue
        let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
        for (const c of geom.coordinates as unknown[]) {
          if (!Array.isArray(c) || c.length < 2) continue
          const lon = Number((c as any)[0])
          const la = Number((c as any)[1])
          if (Number.isNaN(lon) || Number.isNaN(la)) continue
          if (lon < minLon) minLon = lon
          if (la < minLat) minLat = la
          if (lon > maxLon) maxLon = lon
          if (la > maxLat) maxLat = la
        }
        const intersects = !(maxLon < minX || maxX < minLon || maxLat < minY || maxY < minLat)
        if (intersects) idSet.add(seg.streetId)
      }
      nearbyIds = Array.from(idSet)
      if (nearbyIds.length) {
        where.id = { in: nearbyIds }
      } else {
        where.id = { in: ['__none__'] } // force empty
      }
    }
  }

  // If a status is selected, pre-filter streets by their latest visit status via raw SQL, then constrain Prisma query by IDs.
  if (sp.status) {
    const conditions: Prisma.Sql[] = []
    if (sp.search) conditions.push(Prisma.sql`s.name ILIKE ${'%' + sp.search + '%'}`)
    if (sp.hasPhotos === 'on')
      conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "Photo" p WHERE p."streetId" = s.id)`)
    if (sp.hasNotes === 'on')
      conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "Note" n WHERE n."streetId" = s.id)`)
    if (nearbyIds && nearbyIds.length)
      conditions.push(
        Prisma.sql`s.id IN (${Prisma.join(nearbyIds.map((id) => Prisma.sql`${id}`), ', ')})`
      )
  // Require latest visit to match selected status (cast enum to text for safe comparison)
  conditions.push(Prisma.sql`lv.status::text = ${sp.status}`)

    const whereSql = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty

    const rows = await withRetry(() => prisma.$queryRaw<{ id: string }[]>`
      SELECT s.id
      FROM "Street" s
      LEFT JOIN LATERAL (
        SELECT v.status
        FROM "Visit" v
        WHERE v."streetId" = s.id
        ORDER BY v.at DESC
        LIMIT 1
      ) lv ON true
      ${whereSql}
    `)
    const statusIds = rows.map((r) => r.id)
    if (statusIds.length) {
      where.id = { in: statusIds }
    } else {
      where.id = { in: ['__none__'] }
    }
  }

  let itemsRaw: Array<any> = []
  let totalAll = 0
  let visitedCountRaw = 0
  let loadError: string | null = null
  try {
    itemsRaw = await withRetry(() =>
      prisma.street.findMany({
        where,
        include: {
          _count: { select: { segments: true, photos: true, notes: true } },
          visits: { orderBy: { at: 'desc' }, take: 1 }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take
      })
    )

    totalAll = await withRetry(() => prisma.street.count({ where }))

    // Lean raw count of streets whose latest visit status is VISITED, applying the same filters used in `where`.
    visitedCountRaw = await withRetry(async () => {
      const conditions: Prisma.Sql[] = []
      if (sp.search) conditions.push(Prisma.sql`s.name ILIKE ${'%' + sp.search + '%'}`)
      if (sp.hasPhotos === 'on')
        conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "Photo" p WHERE p."streetId" = s.id)`)
      if (sp.hasNotes === 'on')
        conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "Note" n WHERE n."streetId" = s.id)`)
      if (nearbyIds && nearbyIds.length)
        conditions.push(
          Prisma.sql`s.id IN (${Prisma.join(nearbyIds.map((id) => Prisma.sql`${id}`), ', ')})`
        )

      // Always require latest visit to be VISITED
      conditions.push(Prisma.sql`lv.status = 'VISITED'`)

      const whereSql = conditions.length
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty

      const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Street" s
        LEFT JOIN LATERAL (
          SELECT v.status
          FROM "Visit" v
          WHERE v."streetId" = s.id
          ORDER BY v.at DESC
          LIMIT 1
        ) lv ON true
        ${whereSql}
      `
      return Number(rows?.[0]?.count ?? 0)
    })
  } catch (e: any) {
    loadError = 'Temporary database issue. Please try again.'
  }

  let items = itemsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    segments: s._count.segments,
    photos: s._count.photos,
    notes: s._count.notes,
    lastStatus: s.visits[0]?.status ?? null
  }))

  // Safety net: keep client-side filter too, though server-side prefilter above should already limit the set
  if (sp.status) items = items.filter((i) => normalizeStatus(i.lastStatus) === sp.status)

  const visitedCount = visitedCountRaw
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
  <Link href="/streets/random" className="inline-flex w-full justify-center items-center rounded-md border px-3 py-2 text-sm bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20">
          Open random street
        </Link>
  <div className="my-2 border-t" />
  {/* Nearby search: set radius and use current location */}
  <NearbyForm />
  <div className="my-2 border-t" />
        <form className="space-y-3" role="search" aria-label="Filter streets" method="get">
          <div className="space-y-1">
            <input id="search" name="search" aria-label="Search streets" defaultValue={sp.search ?? ''} className="w-full rounded-md border bg-background px-3 py-2 placeholder:text-muted-foreground" placeholder="Search streets" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={sp.status ?? ''} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="">All</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="VISITED">Visited</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="hasPhotos" name="hasPhotos" type="checkbox" className="size-4 border bg-background" defaultChecked={sp.hasPhotos === 'on'} />
            <label htmlFor="hasPhotos" className="text-sm">Has photos</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="hasNotes" name="hasNotes" type="checkbox" className="size-4 border bg-background" defaultChecked={sp.hasNotes === 'on'} />
            <label htmlFor="hasNotes" className="text-sm">Has notes</label>
          </div>
          <div>
            <button className="inline-flex w-full justify-center items-center rounded-md border px-3 py-2 text-sm bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20" type="submit">Apply</button>
          </div>
          <div className="text-center">
            <Link href="/streets" className="text-sm text-muted-foreground underline hover:text-foreground">Clear</Link>
          </div>
        </form>

  <div className="mt-2 border-t pt-2">
          <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{visitedCount}/{totalCount} ({progressPct}%)</span>
          </div>
          <progress className="w-full h-2 [&::-webkit-progress-bar]:bg-muted/80 [&::-webkit-progress-value]:bg-foreground rounded" value={Number(visitedCount)} max={Number(Math.max(1, totalCount))} aria-label="Visited progress" />
        </div>
      </aside>
      <section className="space-y-4">
  {loadError ? (
          <div className="rounded-md border border-red-300 bg-red-100/50 px-3 py-2 text-sm text-red-800">
            {loadError}
          </div>
        ) : null}
  <div className="flex items-center gap-4 border-b">
          <button className="px-3 py-2 border-b-2 border-transparent data-[active=true]:border-primary" data-active>
            List
          </button>
          <Link className="px-3 py-2 text-muted-foreground hover:text-foreground" href="/map">Map</Link>
        </div>
        <div role="region" aria-label="Streets list" className="grid gap-3">
          {items.map((s) => (
            <Link key={s.id} href={`/streets/${s.id}`} className="group rounded-xl border bg-background p-4 hover:bg-muted/50 hover:shadow-lg dark:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-ring transition-all">
              <div className="flex items-center justify-between">
                <div className="font-medium group-hover:underline">{s.name}</div>
                <StatusBadge status={s.lastStatus} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">{s.segments} segments • {s.photos} photos • {s.notes} notes</div>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {/* Previous button */}
          {page > 1 ? (
            <Link
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20"
              href={{ pathname: '/streets', query: buildQuery({ page: String(page - 1) }) }}
            >
              Previous
            </Link>
          ) : (
            <button
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm opacity-50 cursor-not-allowed bg-foreground/5"
              disabled
            >
              Previous
            </button>
          )}
          
          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {(() => {
              const totalPages = Math.ceil(totalAll / take)
              const maxVisiblePages = 7
              const pages: (number | string)[] = []
              
              if (totalPages <= maxVisiblePages) {
                // Show all pages if total is small
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                // Show smart pagination with ellipsis
                pages.push(1)
                
                if (page > 4) {
                  pages.push('...')
                }
                
                const start = Math.max(2, page - 2)
                const end = Math.min(totalPages - 1, page + 2)
                
                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) {
                    pages.push(i)
                  }
                }
                
                if (page < totalPages - 3) {
                  pages.push('...')
                }
                
                if (totalPages > 1) {
                  pages.push(totalPages)
                }
              }
              
              return pages.map((pageNum, index) => {
                if (pageNum === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-muted-foreground">
                      ...
                    </span>
                  )
                }
                
                const isCurrentPage = pageNum === page
                
                return isCurrentPage ? (
                  <span
                    key={pageNum}
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm bg-foreground text-background"
                  >
                    {pageNum}
                  </span>
                ) : (
                  <Link
                    key={pageNum}
                    className="inline-flex items-center rounded-md border px-3 py-2 text-sm bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20"
                    href={{ pathname: '/streets', query: buildQuery({ page: String(pageNum) }) }}
                  >
                    {pageNum}
                  </Link>
                )
              })
            })()}
          </div>
          
          {/* Next button */}
          {(() => {
            const totalPages = Math.ceil(totalAll / take)
            const hasNextPage = page < totalPages
            
            return hasNextPage ? (
              <Link
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20"
                href={{ pathname: '/streets', query: buildQuery({ page: String(page + 1) }) }}
              >
                Next
              </Link>
            ) : (
              <button
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm opacity-50 cursor-not-allowed bg-foreground/5"
                disabled
              >
                Next
              </button>
            )
          })()}
        </div>
      </section>
    </main>
  )
}

// Simple retry for transient DB disconnects (e.g., upstream closed connection)
async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message || '')
      const isConnIssue =
        msg.includes('connection closed') ||
        msg.includes('ECONNRESET') ||
        msg.includes('08006')
      if (i < attempts - 1 && isConnIssue) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)))
        continue
      }
      throw err
    }
  }
  // Should not reach here
  throw lastErr as any
}
