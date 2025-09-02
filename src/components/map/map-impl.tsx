'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY

function statusColorExpr() {
  // Map PLANNED/IN_PROGRESS/VISITED to colors
  return [
    'match',
    ['get', 'status'],
    'VISITED', '#16a34a', // green-600
    'IN_PROGRESS', '#ca8a04', // yellow-600
    'PLANNED', '#64748b', // slate-500
    /* other */ '#94a3b8' // slate-400
  ] as any
}

export function MapImpl() {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (!MAPTILER_KEY) {
      // Render a notice if no key is set
      ref.current.innerHTML = '<div style="padding:12px">Set NEXT_PUBLIC_MAPTILER_API_KEY to show the map.</div>'
      return
    }

    const map = new maplibregl.Map({
      container: ref.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [-0.465, 39.437], // Approx Torrent, Valencia
      zoom: 13,
      attributionControl: false
    })
    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }))

    function updateData() {
      if (!mapRef.current) return
      const b = mapRef.current.getBounds()
      const minX = b.getWest()
      const minY = b.getSouth()
      const maxX = b.getEast()
      const maxY = b.getNorth()
      const url = `/api/streets?bbox=${minX},${minY},${maxX},${maxY}`

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      fetch(url, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load streets'))))
        .then((fc) => {
          const source = mapRef.current?.getSource('streets') as any
          if (source) source.setData(fc)
        })
        .catch(() => {})
    }

    map.on('load', () => {
      map.addSource('streets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'streets-line',
        type: 'line',
        source: 'streets',
        paint: {
          'line-color': statusColorExpr(),
          'line-width': 3
        }
      })
      updateData()
    })
    map.on('moveend', updateData)

    return () => {
      abortRef.current?.abort()
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="relative">
      <div ref={ref} className="h-[80vh] w-full rounded-md border" aria-label="Map" />
      <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-white/90 p-2 text-xs shadow">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-sm bg-green-600" />
          Visited
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-sm bg-yellow-600" />
          In progress
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded-sm bg-slate-500" />
          Planned
        </div>
      </div>
    </div>
  )
}
