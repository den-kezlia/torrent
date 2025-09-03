'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, LineString } from 'geojson'
import { bbox as turfBbox } from '@turf/turf'

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY

function colorForStatus(status: string | null | undefined) {
  switch (status) {
    case 'VISITED':
      return '#16a34a' // green-600
    case 'IN_PROGRESS':
      return '#ca8a04' // yellow-600
    case 'PLANNED':
    default:
      return '#64748b' // slate-500
  }
}

export function StreetMap({
  data,
  status
}: {
  data: FeatureCollection<LineString, { status?: string }>
  status: string | null | undefined
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const isDarkRef = useRef<boolean>(false)

  useEffect(() => {
    if (!ref.current) return
    if (!MAPTILER_KEY) {
      ref.current.innerHTML = '<div style="padding:12px">Set NEXT_PUBLIC_MAPTILER_API_KEY to show the map.</div>'
      return
    }

    const html = document.documentElement
    isDarkRef.current = html.classList.contains('dark')
    const getStyleUrl = () =>
      `https://api.maptiler.com/maps/${isDarkRef.current ? 'streets-v2-dark' : 'streets-v2'}/style.json?key=${MAPTILER_KEY}`

    const map = new maplibregl.Map({
      container: ref.current,
      style: getStyleUrl(),
      center: [-0.465, 39.437],
      zoom: 13,
      attributionControl: false
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }))

  map.on('load', () => {
      map.addSource('street', { type: 'geojson', data })
      map.addLayer({
        id: 'street-line',
        type: 'line',
        source: 'street',
        paint: {
          'line-color': colorForStatus(status),
          'line-width': 4
        }
      })

      try {
        const [minX, minY, maxX, maxY] = turfBbox(data as any)
        map.fitBounds([
          [minX, minY],
          [maxX, maxY]
        ], { padding: 40, duration: 0 })
      } catch {}
    })

    const updateTheme = () => {
      const dark = html.classList.contains('dark')
      if (dark === isDarkRef.current) return
      isDarkRef.current = dark
      map.setStyle(getStyleUrl())
      map.once('style.load', () => {
        if (!map.getSource('street')) {
          map.addSource('street', { type: 'geojson', data })
        } else {
          const src = map.getSource('street') as any
          src.setData(data)
        }
        if (!map.getLayer('street-line')) {
          map.addLayer({
            id: 'street-line',
            type: 'line',
            source: 'street',
            paint: { 'line-color': colorForStatus(status), 'line-width': 4 }
          })
        }
      })
    }

    const mo = new MutationObserver(updateTheme)
    mo.observe(html, { attributes: true, attributeFilter: ['class'] })

    return () => {
      mo.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [data, status])

  return <div ref={ref} className="h-80 w-full rounded-md border" aria-label="Street map" />
}

export default StreetMap
