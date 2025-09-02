'use client'
import dynamic from 'next/dynamic'

const MapImpl = dynamic(() => import('./map-impl').then(m => m.MapImpl), { ssr: false })

export default function ClientMap() {
  return <MapImpl />
}
