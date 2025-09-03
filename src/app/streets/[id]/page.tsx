import { prisma } from '@/server/db'
import Link from 'next/link'
import { PhotoUploader } from '@/components/photos/uploader'
import { VisitStatusPicker } from '@/components/visits/status-picker'
import { AddNote } from '@/components/notes/add-note'
import { NoteMarkdown } from '@/components/notes/markdown'
import { NoteView } from '@/components/notes/note-view'
import type { FeatureCollection, LineString } from 'geojson'
import StreetMap from '@/components/map/street-map'
import DirectionsButton from '@/components/map/directions-button'
import { PhotoDeleteButton } from '@/components/photos/delete-button'

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
    <main className="min-h-screen">
      <Link href="/streets" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <p className="mt-4">Not found</p>
    </main>
  )

  const lastStatus = s.visits[0]?.status ?? '—'
  const fc: FeatureCollection<LineString, { status?: string }> = {
    type: 'FeatureCollection',
    features: s.segments
      .map((seg) => seg.geometry as any)
      .filter((g): g is LineString => g && g.type === 'LineString')
      .map((g) => ({ type: 'Feature', geometry: g, properties: { status: s.visits[0]?.status ?? undefined } }))
  }
  // Compute a start point from the first segment's first coordinate
  const firstLine = s.segments
    .map((seg) => seg.geometry as any)
    .find((g): g is LineString => g && g.type === 'LineString')
  const dest: [number, number] | null = firstLine && Array.isArray(firstLine.coordinates[0])
    ? (firstLine.coordinates[0] as [number, number])
    : null

  return (
    <main className="min-h-screen space-y-6">
      <Link href="/streets" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="font-medium">Status</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded bg-muted px-2 py-0.5">{lastStatus}</span>
            <VisitStatusPicker streetId={s.id} value={s.visits[0]?.status ?? null} />
          </div>
          {dest ? <DirectionsButton dest={dest} className="mt-3" /> : null}
          <div className="mt-3">
            <StreetMap data={fc} status={s.visits[0]?.status ?? null} />
          </div>
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Photos</h2>
            <PhotoUploader streetId={s.id} />
          </div>
          {s.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {s.photos.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-md border">
                  <a href={p.url} target="_blank" rel="noreferrer" aria-label="Open photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="Street photo" className="aspect-square object-cover" />
                  </a>
                  <PhotoDeleteButton id={p.id} canDelete={p.noteId == null} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-medium">Notes</h2>
  <AddNote streetId={s.id} />
        {s.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <NotesList notes={s.notes} streetId={s.id} />
        )}
      </section>
    </main>
  )
}

function NotesList({ notes, streetId }: { notes: { id: string, content: string, createdAt: Date, tags: string[] }[], streetId: string }) {
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
  <li key={n.id} className="rounded-xl border p-3">
          <NoteView id={n.id} content={n.content} createdAt={n.createdAt} tags={n.tags} streetId={streetId} />
        </li>
      ))}
    </ul>
  )
}

// client-only edit toggling moved to components/notes/edit-toggle
