"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function PhotoDeleteButton({ id, canDelete }: { id: string; canDelete: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onConfirm() {
    setBusy(true)
    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      // refresh via location to keep simple
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="destructive" onClick={() => setOpen(true)} disabled={!canDelete || busy} aria-disabled={!canDelete} title={canDelete ? 'Delete photo' : 'Photo managed by note'}>
          Delete
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete photo?"
        description={canDelete ? 'This will permanently delete the image.' : 'This photo is managed by a note.'}
        confirmText="Delete"
        onConfirm={onConfirm}
      />
    </>
  )
}
