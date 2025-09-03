"use client"
import { useState } from 'react'
import { EditNote } from './edit-note'

export function EditToggle({ id, initial, streetId }: { id: string, initial: string, streetId: string }) {
  const [editing, setEditing] = useState(false)
  if (!editing) {
    return (
      <button className="text-xs underline" onClick={() => setEditing(true)}>Edit</button>
    )
  }
  return <EditNote id={id} initial={initial} streetId={streetId} onDone={() => setEditing(false)} />
}
