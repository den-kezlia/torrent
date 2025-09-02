'use client'
import { useCallback, useState } from 'react'
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
  const [pending, setPending] = useState(false)

  const handleClick = useCallback(() => {
    const [lng, lat] = dest
    const destination = `${lat},${lng}`
    const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

    try {
      setPending(true)
      if (!('geolocation' in navigator)) {
        open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin = `${pos.coords.latitude},${pos.coords.longitude}`
          open(
            `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
              destination
            )}&travelmode=${mode}`
          )
          setPending(false)
        },
        () => {
          open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=${mode}`)
          setPending(false)
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
      )
    } finally {
      // In case something throws synchronously
      setPending(false)
    }
  }, [dest, mode])

  return (
    <Button type="button" onClick={handleClick} disabled={pending} className={className}>
      {pending ? 'Locating…' : 'Directions to start'}
    </Button>
  )
}

export default DirectionsButton
