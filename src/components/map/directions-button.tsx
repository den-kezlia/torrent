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
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:opacity-90 h-9 px-3',
        className
      )}
    >
      Direction
    </a>
  )
}

export default DirectionsButton
