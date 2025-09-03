'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, LineString, Feature, Point } from 'geojson'
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
  status,
  photos: markers
}: {
  data: FeatureCollection<LineString, { status?: string }>
  status: string | null | undefined
  photos?: Array<{ id: string; lng: number; lat: number; text?: string; url?: string }>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const isDarkRef = useRef<boolean>(false)
  const photosRef = useRef<typeof markers>(markers)

  useEffect(() => {
    if (!ref.current) return
    if (!MAPTILER_KEY) {
      ref.current.innerHTML = '<div style="padding:12px">Set NEXT_PUBLIC_MAPTILER_API_KEY to show the map.</div>'
      return
    }

    const html = document.documentElement
    const getPhotoFC = () => {
      const list = photosRef.current || []
      const features: Feature<Point, { id: string; text?: string; url?: string }>[] = list
        .filter((p) => typeof p.lng === 'number' && typeof p.lat === 'number')
        .map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, text: p.text, url: p.url } }))
      return { type: 'FeatureCollection', features } as const
    }
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

      // Add photo markers source/layer if any
        map.addSource('photo-points', { type: 'geojson', data: getPhotoFC() })
    map.addLayer({
        id: 'photo-points',
        type: 'circle',
        source: 'photo-points',
        paint: {
      'circle-radius': 9,
          'circle-color': '#3b82f6',
          'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2
        }
      })

      map.on('click', 'photo-points', (e) => {
        const f = (e.features && e.features[0]) as any
        if (!f) return
        const coords = f.geometry.coordinates.slice()
  const text = f.properties?.text as string | undefined
        const url = f.properties?.url as string | undefined
        const img = url ? `<img src="${escapeAttr(url)}" alt="Photo" style="display:block;max-width:100%;width:auto;height:auto;max-height:220px;border-radius:6px;margin:0 0 6px 0;object-fit:contain"/>` : ''
        const caption = text ? `<div style="font-size:12px;line-height:1.3;color:#0f172a;">${escapeHtml(text)}</div>` : ''
        const html = `<div style="max-width:300px">${img}${caption}</div>`
        new maplibregl.Popup({ closeOnClick: true, maxWidth: '320px' })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map)
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
        if (!map.getSource('photo-points')) {
            map.addSource('photo-points', { type: 'geojson', data: getPhotoFC() })
        }
        if (!map.getLayer('photo-points')) {
          map.addLayer({ id: 'photo-points', type: 'circle', source: 'photo-points', paint: { 'circle-radius': 9, 'circle-color': '#3b82f6', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
        }
          // Ensure data is set after style reload
          const src = map.getSource('photo-points') as any
          if (src) src.setData(getPhotoFC())
      })
    }

    const mo = new MutationObserver(updateTheme)
    mo.observe(html, { attributes: true, attributeFilter: ['class'] })

    return () => {
      mo.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [data, status, markers])

  // Update photo markers when props change
  useEffect(() => {
    photosRef.current = markers
    const map = mapRef.current
    if (!map) return
    const features: Feature<Point, { id: string; text?: string; url?: string }>[] = (markers || [])
      .filter((p) => typeof p.lng === 'number' && typeof p.lat === 'number')
      .map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, text: p.text, url: p.url } }))
    const fc = { type: 'FeatureCollection', features } as const
    const src = map.getSource('photo-points') as any
    if (src) src.setData(fc)
  }, [markers])

  return <div ref={ref} className="h-80 w-full rounded-md border" aria-label="Street map" />
}

export default StreetMap

function escapeHtml(str: string) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttr(str: string) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
