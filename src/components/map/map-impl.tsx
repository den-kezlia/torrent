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
  const isDarkRef = useRef<boolean>(false)
  const markersAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (!MAPTILER_KEY) {
      // Render a notice if no key is set
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

    function updateMarkers() {
      if (!mapRef.current) return
      const b = mapRef.current.getBounds()
      const minX = b.getWest()
      const minY = b.getSouth()
      const maxX = b.getEast()
      const maxY = b.getNorth()
      const url = `/api/markers?bbox=${minX},${minY},${maxX},${maxY}`
      markersAbortRef.current?.abort()
      const controller = new AbortController()
      markersAbortRef.current = controller
      fetch(url, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load markers'))))
        .then((res) => {
          const features: any[] = []
          for (const p of res.photos || []) {
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: `photo-${p.id}`, url: p.url, streetId: p.streetId, noteId: p.noteId, text: p.text } })
          }
          for (const n of res.notes || []) {
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: { id: `note-${n.id}`, url: n.url, text: n.text, streetId: n.streetId, noteId: n.id } })
          }
          const fc = { type: 'FeatureCollection', features }
          const src = mapRef.current?.getSource('poi-markers') as any
          if (src) src.setData(fc)
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
      map.addSource('poi-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'poi-markers', type: 'circle', source: 'poi-markers', paint: { 'circle-radius': 7, 'circle-color': '#3b82f6', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } })

      map.on('click', 'poi-markers', (e) => {
        const f = (e.features && e.features[0]) as any
        if (!f) return
        const coords = f.geometry.coordinates.slice()
  const text = f.properties?.text as string | undefined
  const url = f.properties?.url as string | undefined
  const streetId = f.properties?.streetId as string | undefined
  const noteId = f.properties?.noteId as string | undefined
        const img = url ? `<img src="${escapeAttr(url)}" alt="Photo" style="display:block;max-width:100%;width:auto;height:auto;max-height:220px;border-radius:6px;margin:0 0 6px 0;object-fit:contain"/>` : ''
  const caption = text ? `<div style="font-size:12px;line-height:1.3;color:#0f172a;">${escapeHtml(text)}</div>` : ''
  const link = streetId ? `<div style="margin-top:6px"><a href="/streets/${escapeAttr(streetId)}${noteId ? `#note-${escapeAttr(noteId)}` : ''}" style="font-size:12px;color:#2563eb;text-decoration:underline">Open street</a></div>` : ''
  const html = `<div style="max-width:300px">${img}${caption}${link}</div>`
        new maplibregl.Popup({ closeOnClick: true, maxWidth: '320px' }).setLngLat(coords).setHTML(html).addTo(map)
      })

      updateData()
      updateMarkers()
    })
    map.on('moveend', () => { updateData(); updateMarkers() })

    // Observe theme changes and update style without losing layers
    const updateTheme = () => {
      const dark = html.classList.contains('dark')
      if (dark === isDarkRef.current) return
      isDarkRef.current = dark
      const styleUrl = getStyleUrl()
      // Swap style while preserving custom layers by re-adding them on style.load
      map.setStyle(styleUrl)
      map.once('style.load', () => {
        if (!map.getSource('streets')) {
          map.addSource('streets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }
        if (!map.getLayer('streets-line')) {
          map.addLayer({
            id: 'streets-line',
            type: 'line',
            source: 'streets',
            paint: { 'line-color': statusColorExpr(), 'line-width': 3 }
          })
        }
        if (!map.getSource('poi-markers')) {
          map.addSource('poi-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }
        if (!map.getLayer('poi-markers')) {
          map.addLayer({ id: 'poi-markers', type: 'circle', source: 'poi-markers', paint: { 'circle-radius': 7, 'circle-color': '#3b82f6', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } })
        }
        updateData()
        updateMarkers()
      })
    }

    const mo = new MutationObserver(updateTheme)
    mo.observe(html, { attributes: true, attributeFilter: ['class'] })

    return () => {
  abortRef.current?.abort()
  markersAbortRef.current?.abort()
      mo.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="relative">
  <div ref={ref} className="h-[80vh] w-full rounded-md border" aria-label="Map" />
  <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-background/90 p-2 text-xs text-foreground shadow">
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
