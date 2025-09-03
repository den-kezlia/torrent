import { prisma } from '@/server/db'

type OverpassElement =
  | { type: 'node'; id: number; lat: number; lon: number }
  | { type: 'way'; id: number; nodes: number[]; tags?: Record<string, string> }
  | { type: 'relation'; id: number }

type OverpassResponse = { elements: OverpassElement[] }

function q(strings: TemplateStringsArray, ...values: Array<string | number>) {
  // Helper for readable template queries
  return strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''), '')
}

async function callOverpass(query: string): Promise<OverpassResponse> {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }).toString()
  })
  if (!res.ok) {
    throw new Error(`Overpass error: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as OverpassResponse
}

async function fetchAreaId(boundary: string): Promise<number> {
  // Find administrative relation by name; take first result
  const query = q`
    [out:json][timeout:180];
    rel["boundary"="administrative"]["name"="${boundary}"]; 
    out ids;
  `
  const json = await callOverpass(query)
  const rel = json.elements.find((e) => e.type === 'relation') as { type: 'relation'; id: number } | undefined
  if (!rel) throw new Error(`No administrative relation found for ${boundary}`)
  // area id is 3600000000 + relation id
  return 3600000000 + rel.id
}

async function fetchHighwaysInArea(areaId: number): Promise<OverpassResponse> {
  // Only fetch named streets and limit to common roadway types (exclude service paths, tracks, etc.)
  const query = q`
    [out:json][timeout:180];
    area(${areaId})->.searchArea;
    (
      way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street|trunk|trunk_link|motorway|motorway_link)$"]["name"](area.searchArea);
    );
    (._;>;);
    out body;
  `
  return callOverpass(query)
}

function toLineString(nodeIds: number[], nodeMap: Map<number, { lat: number; lon: number }>) {
  const coords: [number, number][] = []
  for (const nid of nodeIds) {
    const n = nodeMap.get(nid)
    if (!n) continue
    coords.push([n.lon, n.lat])
  }
  if (coords.length < 2) return null
  return {
    type: 'LineString',
    coordinates: coords
  } as const
}

function normalizeStreetKey(name: string) {
  return `street-name:${name.trim().toLowerCase()}`
}

function pickStreetName(tags?: Record<string, string>) {
  if (!tags) return undefined
  // Prefer generic name, then localized variants commonly used in Valencia area
  return (
    tags['name']?.trim() ||
    tags['name:ca']?.trim() ||
    tags['name:val']?.trim() ||
    tags['name:es']?.trim() ||
    tags['official_name']?.trim() ||
    undefined
  )
}

export async function importStreets(
  boundary = 'Torrent, Valencia',
  opts: { pruneUnnamed?: boolean } = {}
) {
  const pruneUnnamed = opts.pruneUnnamed ?? true
  // Attempt exact match by full boundary string; fallback to first token before comma if not found
  let areaId: number
  try {
    areaId = await fetchAreaId(boundary)
  } catch {
    const short = boundary.split(',')[0]?.trim() || boundary
    areaId = await fetchAreaId(short)
  }

  const data = await fetchHighwaysInArea(areaId)
  const nodes = new Map<number, { lat: number; lon: number }>()
  const ways: Array<Extract<OverpassElement, { type: 'way' }>> = []

  for (const el of data.elements) {
    if (el.type === 'node') nodes.set(el.id, { lat: el.lat, lon: el.lon })
    else if (el.type === 'way') ways.push(el)
  }

  // Group ways by street name; skip unnamed ways entirely
  const groups = new Map<string, Array<typeof ways[number]>>()
  for (const w of ways) {
    const name = pickStreetName(w.tags)
    if (!name) continue
    const key = normalizeStreetKey(name)
    const arr = groups.get(key) ?? []
    arr.push(w)
    groups.set(key, arr)
  }

  let createdStreets = 0
  let updatedStreets = 0
  let upsertedSegments = 0

  for (const [key, wlist] of groups) {
    if (!Array.isArray(wlist) || wlist.length === 0) continue
  const first = wlist[0]!
  const name = pickStreetName(first.tags)!
    const street = await prisma.street.upsert({
      where: { osmId: key },
      update: { name },
      create: { osmId: key, name }
    })
    if (street.createdAt.getTime() === street.updatedAt.getTime()) createdStreets++
    else updatedStreets++

    // Upsert segments
    for (const w of wlist) {
      const geom = toLineString(w.nodes, nodes)
      if (!geom) continue
      await prisma.streetSegment.upsert({
        where: { osmId: `way:${w.id}` },
        update: { streetId: street.id, geometry: geom },
        create: { osmId: `way:${w.id}`, streetId: street.id, geometry: geom }
      })
      upsertedSegments++
    }
  }

  // Optionally prune legacy unnamed imports (those created previously as individual ways)
  let prunedUnnamed = 0
  if (pruneUnnamed) {
    const del = await prisma.street.deleteMany({ where: { osmId: { startsWith: 'street-way:' } } })
    prunedUnnamed = del.count
  }

  return { createdStreets, updatedStreets, upsertedSegments, prunedUnnamed }
}
