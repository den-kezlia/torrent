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
import { prettyStatus } from '@/lib/utils'
import { PhotoDeleteButton } from '@/components/photos/delete-button'
import { PhotoGrid } from '@/components/photos/photo-grid'

function stripMarkdown(input: string): string {
  return input
    // code fences
    .replace(/```[\s\S]*?```/g, '')
    // inline code
    .replace(/`([^`]*)`/g, '$1')
    // images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1')
    // links [text](url) -> text
    .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
    // emphasis **text** *text* __text__ _text_ -> text
    .replace(/([*_]{1,3})([^*_]+)\1/g, '$2')
    // headings
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    // blockquotes
    .replace(/^\s{0,3}>\s?/gm, '')
    // list markers
    .replace(/^\s*([-*+]\s+|\d+\.\s+)/gm, '')
    // html tags
    .replace(/<[^>]+>/g, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

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

  const lastStatus = s.visits[0]?.status ?? null
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
  <div className="rounded-xl border bg-background p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <VisitStatusPicker streetId={s.id} value={s.visits[0]?.status ?? null} />
            {dest ? <DirectionsButton dest={dest} className="ml-auto" /> : null}
          </div>
          <div className="mt-3">
            {(() => {
              const notesWithGeo = (s.notes as any[]).filter((n) => (n as any).lng != null && (n as any).lat != null)
              const noteIdsWithGeo = new Set(notesWithGeo.map((n) => n.id))
              const noteMarkers = notesWithGeo.map((n) => {
                // Show a photo in the popup if the note has any attached photo (regardless of photo geotagging)
                const gp = (s.photos as any[]).find((p) => p.noteId === n.id)
                const text = n.content ? stripMarkdown(n.content).slice(0, 120) : undefined
                return { id: `note-${n.id}`, lng: (n as any).lng, lat: (n as any).lat, url: gp?.url, text }
              })
              const photoMarkers = (s.photos as any[])
                .filter((p) => p.lng != null && p.lat != null && !noteIdsWithGeo.has(p.noteId))
                .map((p) => {
                  const note = (s.notes as any[]).find((n) => p.noteId === n.id)
                  const text = note?.content ? stripMarkdown(note.content).slice(0, 120) : undefined
                  return { id: `photo-${p.id}`, lng: p.lng, lat: p.lat, url: p.url, text }
                })
              const markers = [...noteMarkers, ...photoMarkers]
              return (
                <StreetMap
                  data={fc}
                  status={s.visits[0]?.status ?? null}
                  photos={markers}
                />
              )
            })()}
          </div>
        </div>
  <div className="rounded-xl border bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Gallery</h2>
            <PhotoUploader streetId={s.id} />
          </div>
          {s.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : (
            <PhotoGrid photos={s.photos as any} />
          )}
        </div>
      </section>
  <section className="rounded-xl border bg-background p-4 space-y-3">
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

function NotesList({ notes, streetId }: { notes: { id: string, content: string, createdAt: Date, tags: string[], lng?: number | null, lat?: number | null }[], streetId: string }) {
  return (
    <ul className="space-y-3">
    {notes.map((n) => (
  <li key={n.id} id={`note-${n.id}`} className="rounded-md border p-3">
      <NoteView id={n.id} content={n.content} createdAt={n.createdAt} tags={n.tags} streetId={streetId} hasGeo={((n as any).lng != null) && ((n as any).lat != null)} />
        </li>
      ))}
    </ul>
  )
}

// client-only edit toggling moved to components/notes/edit-toggle
