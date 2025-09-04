"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientNearbyButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()

  function getPosition(opts?: PositionOptions) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, opts)
    })
  }

  async function onClick() {
    setMsg(null)
    setBusy(true)
    try {
      const pos = await getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const res = await fetch(`/api/streets/nearby?lat=${lat}&lng=${lng}&radius=100`)
      if (!res.ok) throw new Error('Failed to search nearby streets')
      const data = await res.json()
      const streets: Array<{ id: string; name: string }> = Array.isArray(data.streets) ? data.streets : []
      if (streets.length > 0 && streets[0]?.id) {
        router.push(`/streets/${streets[0]!.id}`)
      } else {
        setMsg('No streets within 100m')
      }
    } catch (e) {
      setMsg((e as Error).message || 'Unable to get location')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1">
      <button onClick={onClick} disabled={busy} className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50">
        {busy ? 'Searching…' : 'Search nearby streets'}
      </button>
      {msg ? <div className="text-xs text-muted-foreground">{msg}</div> : null}
    </div>
  )
}
