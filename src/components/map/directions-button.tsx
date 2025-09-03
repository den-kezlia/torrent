'use client'
import { Button } from '@/components/ui/button'

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
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      <Button type="button">Directions to start</Button>
    </a>
  )
}

export default DirectionsButton
