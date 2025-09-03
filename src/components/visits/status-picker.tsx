"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Status = 'PLANNED' | 'IN_PROGRESS' | 'VISITED'

export function VisitStatusPicker({ streetId, value }: { streetId: string; value: Status | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status | ''>(value ?? '')

  async function onChange(next: string) {
    setStatus(next as any)
    setBusy(true)
    try {
      if (!next) {
        await fetch(`/api/streets/${streetId}/visit`, { method: 'DELETE' })
      } else {
        await fetch(`/api/streets/${streetId}/visit`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: next })
        })
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Set status:</span>
      <select
  className="rounded-md border bg-background text-foreground px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={status}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Visit status"
      >
        <option value="">—</option>
        <option value="PLANNED">Planned</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="VISITED">Visited</option>
      </select>
    </label>
  )
}
