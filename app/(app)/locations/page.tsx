'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Location } from '@/lib/utils'
import {
  MapPin,
  Plus,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Navigation,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const WorkplaceMap = dynamic(() => import('@/components/dashboard/WorkplaceMap'), {
  ssr: false,
  loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Cargando mapa...</div>,
})

interface LocationForm {
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
}

const EMPTY_FORM: LocationForm = {
  name: '',
  address: '',
  latitude: 10.48395,
  longitude: -66.91281,
  radius_meters: 50,
  is_active: true,
}

export default function LocationsPage() {
  const supabase = createClient()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editLocation, setEditLocation] = useState<Location | null>(null)
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('locations').select('*').order('name')
    if (data) setLocations(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditLocation(null)
    setForm(EMPTY_FORM)
    setMessage(null)
    setShowModal(true)
  }

  const openEdit = (loc: Location) => {
    setEditLocation(loc)
    setForm({
      name: loc.name,
      address: loc.address || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius_meters: loc.radius_meters,
      is_active: loc.is_active,
    })
    setMessage(null)
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const payload = {
      name: form.name,
      address: form.address || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters),
      is_active: form.is_active,
    }

    const { error } = editLocation
      ? await supabase.from('locations').update(payload).eq('id', editLocation.id)
      : await supabase.from('locations').insert(payload)

    if (error) {
      setMessage({ type: 'error', text: 'Error al guardar la sede.' })
    } else {
      setMessage({ type: 'success', text: `Sede ${editLocation ? 'actualizada' : 'creada'} exitosamente.` })
      await load()
      setTimeout(() => setShowModal(false), 1000)
    }
    setSaving(false)
  }

  const toggleActive = async (loc: Location) => {
    await supabase.from('locations').update({ is_active: !loc.is_active }).eq('id', loc.id)
    await load()
  }

  const useCurrentPosition = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setForm(f => ({
        ...f,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }))
    })
  }

  return (
    <div className="locations-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Sedes</h1>
          <p className="page-subtitle">Gestiona los puntos de trabajo con sus coordenadas GPS</p>
        </div>
        <button id="create-location-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Nueva sede
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : (
        <div className="locations-grid">
          {locations.map(loc => (
            <div key={loc.id} className={`location-card card card-hover ${!loc.is_active ? 'inactive' : ''}`}>
              <div className="location-card-header">
                <div className="location-icon">
                  <MapPin size={20} style={{ color: 'var(--teal-400)' }} />
                </div>
                <span className={`badge ${loc.is_active ? 'badge-success' : 'badge-error'}`}>
                  {loc.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <h3 className="location-name">{loc.name}</h3>
              {loc.address && <p className="location-address">{loc.address}</p>}

              <div className="location-coords">
                <div className="coord-item">
                  <span className="coord-label">Lat</span>
                  <span className="coord-value">{loc.latitude.toFixed(5)}</span>
                </div>
                <div className="coord-item">
                  <span className="coord-label">Lon</span>
                  <span className="coord-value">{loc.longitude.toFixed(5)}</span>
                </div>
                <div className="coord-item">
                  <span className="coord-label">Radio</span>
                  <span className="coord-value">{loc.radius_meters}m</span>
                </div>
              </div>

              <div className="location-map">
                <WorkplaceMap activeCount={0} />
              </div>

              <div className="location-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(loc)}>
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  className={`btn btn-sm ${loc.is_active ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => toggleActive(loc)}
                >
                  {loc.is_active
                    ? <><ToggleRight size={14} /> Desactivar</>
                    : <><ToggleLeft size={14} /> Activar</>
                  }
                </button>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon"><MapPin size={28} /></div>
              <p>No hay sedes registradas</p>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <Plus size={14} /> Agregar primera sede
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editLocation ? 'Editar Sede' : 'Nueva Sede'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} style={{ padding: '0.4rem' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombre de la sede *</label>
                  <input
                    id="loc-name"
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ej: El Cementerio"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Dirección</label>
                  <input
                    id="loc-address"
                    className="form-input"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="Ej: Av. Principal, Caracas"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Latitud *</label>
                  <input
                    id="loc-lat"
                    type="number"
                    step="any"
                    className="form-input"
                    value={form.latitude}
                    onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitud *</label>
                  <input
                    id="loc-lon"
                    type="number"
                    step="any"
                    className="form-input"
                    value={form.longitude}
                    onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Radio (metros)</label>
                  <input
                    id="loc-radius"
                    type="number"
                    min="10"
                    max="500"
                    className="form-input"
                    value={form.radius_meters}
                    onChange={e => setForm({ ...form, radius_meters: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <label className="form-label">Usar mi posición</label>
                  <button type="button" className="btn btn-ghost" onClick={useCurrentPosition}>
                    <Navigation size={14} /> Obtener GPS
                  </button>
                </div>
              </div>

              {message && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {message.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button id="save-location-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="spinning" /> Guardando...</> : 'Guardar sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .locations-page {}
        .locations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }
        .location-card {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .location-card.inactive { opacity: 0.55; }
        .location-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .location-icon {
          width: 40px;
          height: 40px;
          background: rgba(0, 109, 109, 0.12);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .location-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .location-address {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .location-coords {
          display: flex;
          gap: 0.75rem;
        }
        .coord-item {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .coord-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .coord-value {
          font-size: 0.8rem;
          font-family: monospace;
          color: var(--teal-400);
        }
        .location-map {
          border-radius: var(--radius-md);
          overflow: hidden;
          height: 180px;
        }
        .location-actions {
          display: flex;
          gap: 0.5rem;
          border-top: 1px solid var(--border-subtle);
          padding-top: 0.75rem;
        }
        .spinning { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  )
}
