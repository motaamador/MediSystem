'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const MEDISYSTEM_HQ = {
  lat: 10.48395,
  lon: -66.91281,
  name: 'El Cementerio',
  radius: 50,
}

interface WorkplaceMapProps {
  activeCount?: number
}

export default function WorkplaceMap({ activeCount = 0 }: WorkplaceMapProps) {
  return (
    <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <MapContainer
        center={[MEDISYSTEM_HQ.lat, MEDISYSTEM_HQ.lon]}
        zoom={17}
        style={{ height: '100%', width: '100%', background: '#1a1f2e' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 50m radius circle */}
        <Circle
          center={[MEDISYSTEM_HQ.lat, MEDISYSTEM_HQ.lon]}
          radius={MEDISYSTEM_HQ.radius}
          pathOptions={{
            color: '#006D6D',
            fillColor: '#006D6D',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '6 4',
          }}
        />

        {/* Sede marker */}
        <Marker position={[MEDISYSTEM_HQ.lat, MEDISYSTEM_HQ.lon]}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', padding: '0.25rem' }}>
              <strong style={{ color: '#006D6D' }}>🏥 {MEDISYSTEM_HQ.name}</strong><br />
              <small style={{ color: '#666' }}>Radio de asistencia: {MEDISYSTEM_HQ.radius}m</small><br />
              {activeCount > 0 && (
                <span style={{ color: '#10b981', fontWeight: 600 }}>
                  ✓ {activeCount} persona{activeCount > 1 ? 's' : ''} activa{activeCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          font-family: 'Inter', sans-serif !important;
        }
        .leaflet-control-attribution {
          font-size: 10px !important;
          background: rgba(0,0,0,0.5) !important;
          color: #aaa !important;
        }
        .leaflet-control-attribution a {
          color: #888 !important;
        }
        .leaflet-popup-content-wrapper {
          background: #0d1427 !important;
          color: #f0f4ff !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
          border-radius: 10px !important;
        }
        .leaflet-popup-tip {
          background: #0d1427 !important;
        }
      `}</style>
    </div>
  )
}
