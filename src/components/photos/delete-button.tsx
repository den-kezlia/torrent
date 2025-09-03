"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Trash2 } from 'lucide-react'

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
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={!canDelete || busy}
        aria-disabled={!canDelete}
        aria-label={canDelete ? 'Delete photo' : 'Photo managed by note'}
        className="p-2 h-8 w-8 rounded-full shadow"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
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
