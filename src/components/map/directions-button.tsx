'use client'
import { cn } from '@/lib/utils'

type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit'

export function DirectionsButton({
  dest,
  mode = 'walking',
  className
}: {
  dest: [number, number] // [lng, lat]
  mode?: TravelMode
  className?: string
}) {
  const [lng, lat] = dest
  const destination = `${lat},${lng}`
  const href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
  'inline-flex items-center rounded-md px-3 py-2 text-sm transition-colors border border-foreground/20 text-muted-foreground hover:text-foreground hover:bg-muted',
        className
      )}
    >
      Direction
    </a>
  )
}

export default DirectionsButton
