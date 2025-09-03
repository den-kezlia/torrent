import ClientMap from '@/components/map/client-map'
import Link from 'next/link'

export default function MapPage() {
  return (
    <main className="min-h-screen space-y-4">
      <Link href="/streets" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <h1 className="text-2xl font-semibold tracking-tight">Map</h1>
      <p className="text-sm text-muted-foreground">Torrent, Valencia — visited and not visited streets</p>
      <ClientMap />
    </main>
  )
}
