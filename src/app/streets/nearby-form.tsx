"use client"
import { useEffect, useState } from 'react'

export default function NearbyForm() {
  const [radius, setRadius] = useState<string>('100')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const r = url.searchParams.get('radius')
      if (r && ['100', '300', '500', '1000'].includes(r)) setRadius(r)
    } catch {
      /* no-op */
    }
  }, [])

  function getPosition(opts?: PositionOptions) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, opts)
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      const pos = await getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const url = new URL(window.location.href)
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lng', String(lng))
      url.searchParams.set('radius', String(radius))
      url.searchParams.set('nearby', '1')
      window.location.assign(url.toString())
    } catch (e) {
      setMsg((e as Error).message || 'Unable to get location')
    } finally {
      setBusy(false)
    }
  }

  function onClear() {
    const url = new URL(window.location.href)
    url.searchParams.delete('lat')
    url.searchParams.delete('lng')
    url.searchParams.delete('radius')
    url.searchParams.delete('nearby')
    window.location.assign(url.toString())
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2" role="search" aria-label="Nearby streets">
      <div className="flex items-center gap-2">
        <select id="nearby-radius" className="rounded-md border bg-background px-2 py-1 text-sm" value={radius} onChange={(e) => setRadius(e.target.value)}>
          <option value="100">100 m</option>
          <option value="300">300 m</option>
          <option value="500">500 m</option>
          <option value="1000">1000 m</option>
        </select>
  <button className="inline-flex flex-1 justify-center items-center rounded-md border px-3 py-2 text-sm disabled:opacity-50 bg-foreground/5 hover:bg-foreground/10 dark:bg-foreground/10 dark:hover:bg-foreground/20" disabled={busy} type="submit">
          {busy ? 'Searching…' : 'Search nearby streets'}
        </button>
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center text-sm text-muted-foreground underline hover:text-foreground"
        >
          Clear
        </button>
      </div>
      {msg ? <div className="text-xs text-muted-foreground">{msg}</div> : null}
    </form>
  )
}
