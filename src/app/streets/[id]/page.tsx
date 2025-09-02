import { prisma } from '@/server/db'
import Link from 'next/link'
import { PhotoUploader } from '@/components/photos/uploader'
import { VisitStatusPicker } from '@/components/visits/status-picker'
import { AddNote } from '@/components/notes/add-note'

export default async function StreetDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await prisma.street.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { createdAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      visits: { orderBy: { at: 'desc' }, take: 1 },
      segments: true
    }
  })
  if (!s) return (
    <main className="min-h-screen p-4">
      <Link href="/streets" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <p className="mt-4">Not found</p>
    </main>
  )

  const lastStatus = s.visits[0]?.status ?? '—'

  return (
    <main className="min-h-screen p-4 space-y-4">
      <Link href="/streets" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <h1 className="text-xl font-semibold">{s.name}</h1>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border p-4 space-y-2">
          <h2 className="font-medium">Status</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded bg-muted px-2 py-0.5">{lastStatus}</span>
            <VisitStatusPicker streetId={s.id} value={s.visits[0]?.status ?? null} />
          </div>
        </div>
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Photos</h2>
            <PhotoUploader streetId={s.id} />
          </div>
          {s.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {s.photos.map((p) => (
                <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Street photo" className="aspect-square object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="rounded-md border p-4 space-y-3">
        <h2 className="font-medium">Notes</h2>
  <AddNote streetId={s.id} />
        {s.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {s.notes.map((n) => (
              <li key={n.id} className="rounded-md border p-3">
                <div className="text-sm">{n.content}</div>
                {n.tags?.length ? (
                  <div className="mt-1 text-xs text-muted-foreground">{n.tags.map((t) => `#${t}`).join(' ')}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
