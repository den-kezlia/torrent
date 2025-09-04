"use client"
import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PhotoDeleteButton } from './delete-button'

type Photo = { id: string; url: string; noteId: string | null }

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const ordered = useMemo(() => photos, [photos])
  const current = ordered[index]

  const openAt = useCallback((i: number) => {
    setIndex(i)
    setOpen(true)
  }, [])

  const prev = useCallback(() => setIndex((i) => (i - 1 + ordered.length) % ordered.length), [ordered.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % ordered.length), [ordered.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, prev, next])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {ordered.map((p, i) => (
          <div key={p.id} onClick={() => openAt(i)} className="group relative block overflow-hidden rounded-md border cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="Street photo" className="aspect-square object-contain bg-muted" />
            {p.noteId == null ? (
              <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <PhotoDeleteButton id={p.id} canDelete={true} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none">
            {current ? (
              <div className="relative max-w-5xl max-h-[85vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.url} alt="Photo" className="max-h-[85vh] max-w-[90vw] rounded-lg shadow" />
                {ordered.length > 1 ? (
                  <>
                    <Button className="absolute left-2 top-1/2 -translate-y-1/2" variant="outline" onClick={prev} aria-label="Previous">◀</Button>
                    <Button className="absolute right-2 top-1/2 -translate-y-1/2" variant="outline" onClick={next} aria-label="Next">▶</Button>
                  </>
                ) : null}
                <Button className="absolute right-2 top-2" variant="outline" onClick={() => setOpen(false)} aria-label="Close">✕</Button>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
