"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddNote({ streetId }: { streetId: string }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    try {
      await fetch(`/api/streets/${streetId}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: value })
      })
      setValue('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="flex gap-2" onSubmit={submit} aria-label="Add a note">
      <input className="flex-1 rounded-md border px-3 py-2" placeholder="Add a note" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="rounded-md border px-3 py-2 text-sm" disabled={busy || !value.trim()}>
        {busy ? 'Adding…' : 'Add'}
      </button>
    </form>
  )
}
