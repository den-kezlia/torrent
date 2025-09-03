"use client"
import { useState } from 'react'
import { NoteMarkdown } from './markdown'
import { EditNote } from './edit-note'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'

export function NoteView({ id, content, createdAt, tags, streetId }: { id: string, content: string, createdAt: string | Date, tags: string[], streetId: string }) {
  const [editing, setEditing] = useState(false)
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()
  async function doDelete() {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <time className="text-xs text-muted-foreground" dateTime={date.toISOString()}>
          {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}
        </time>
        {!editing ? (
          <div className="flex gap-2">
            <button className="text-xs rounded-md border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setEditing(true)}>Edit</button>
            <button className="text-xs rounded-md border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setConfirmOpen(true)}>Delete</button>
          </div>
        ) : null}
      </div>
      {!editing ? (
        <NoteMarkdown content={content} />
      ) : (
        <EditNote id={id} initial={content} streetId={streetId} onDone={() => setEditing(false)} />
      )}
      {tags?.length ? (
        <div className="mt-1 text-xs text-muted-foreground">{tags.map((t) => `#${t}`).join(' ')}</div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete note?"
        description="This action cannot be undone. The note will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDelete}
      />
    </div>
  )
}
