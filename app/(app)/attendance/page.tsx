'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { haversineDistance } from '@/lib/haversine'
import {
  Location,
  AttendanceRecord,
  formatTime,
  formatDuration,
  getElapsedTime,
} from '@/lib/utils'
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
  Building2,
} from 'lucide-react'

interface GpsState {
  status: 'idle' | 'requesting' | 'acquired' | 'error' | 'denied'
  lat: number | null
  lon: number | null
  accuracy: number | null
  error: string | null
}

export default function AttendancePage() {
  const supabase = createClient()

  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null)
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [gps, setGps] = useState<GpsState>({
    status: 'idle',
    lat: null,
    lon: null,
    accuracy: null,
    error: null,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)

  // Compute distance
  const distance = gps.lat !== null && gps.lon !== null && selectedLocation
    ? haversineDistance(gps.lat, gps.lon, selectedLocation.latitude, selectedLocation.longitude)
    : null

  const isWithinRange = distance !== null && distance <= (selectedLocation?.radius_meters ?? 50)

  // Load user & data
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load locations
      const { data: locs } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (locs && locs.length > 0) {
        setLocations(locs)
        setSelectedLocation(locs[0])
      }

      // Load today's records
      await loadTodayRecords(user.id)
    }
    init()
  }, [])

  const loadTodayRecords = async (uid: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance_records')
      .select('*, location:locations(name)')
      .eq('employee_id', uid)
      .eq('date', today)
      .order('check_in_time', { ascending: false })

    if (data) {
      setTodayRecords(data)
      const active = data.find((r) => r.status === 'active')
      setActiveRecord(active || null)
    }
  }

  // Elapsed timer
  useEffect(() => {
    if (!activeRecord) { setElapsed(''); return }
    const update = () => setElapsed(getElapsedTime(activeRecord.check_in_time))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [activeRecord])

  // Sync selected location with active record
  useEffect(() => {
    if (activeRecord && locations.length > 0) {
      const activeLoc = locations.find(l => l.id === activeRecord.location_id)
      if (activeLoc) setSelectedLocation(activeLoc)
    }
  }, [activeRecord, locations])

  // GPS watch
  const startGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGps(prev => ({ ...prev, status: 'error', error: 'Tu dispositivo no soporta geolocalización.' }))
      return
    }
    setGps(prev => ({ ...prev, status: 'requesting' }))

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({
          status: 'acquired',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
        })
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Permiso de ubicación denegado. Actívalo en tu navegador.'
          : err.code === 2 ? 'No se pudo obtener la ubicación. Verifica tu GPS.'
          : 'Tiempo de espera agotado al obtener la ubicación.'
        setGps(prev => ({
          ...prev,
          status: err.code === 1 ? 'denied' : 'error',
          error: msg,
        }))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    )
    setWatchId(id)
  }, [])

  useEffect(() => {
    startGps()
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  const handleCheckIn = async () => {
    if (!userId || !selectedLocation || !gps.lat || !gps.lon) return
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: userId,
        location_id: selectedLocation.id,
        check_in_lat: gps.lat,
        check_in_lon: gps.lon,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      setMessage({ type: 'error', text: 'Error al registrar entrada. Intenta de nuevo.' })
    } else {
      setActiveRecord(data)
      setMessage({ type: 'success', text: `¡Entrada registrada a las ${formatTime(data.check_in_time)}!` })
      await loadTodayRecords(userId)
    }
    setLoading(false)
  }

  const handleCheckOut = async () => {
    if (!userId || !activeRecord || !gps.lat || !gps.lon) return
    setLoading(true)
    setMessage(null)

    const { error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: new Date().toISOString(),
        check_out_lat: gps.lat,
        check_out_lon: gps.lon,
      })
      .eq('id', activeRecord.id)

    if (error) {
      console.error('Check-out error:', error)
      setMessage({ type: 'error', text: `Error al registrar salida: ${error.message || 'Intenta de nuevo.'}` })
    } else {
      setMessage({ type: 'success', text: '¡Salida registrada exitosamente!' })
      setActiveRecord(null)
      await loadTodayRecords(userId)
    }
    setLoading(false)
  }

  const gpsColor = gps.status === 'acquired'
    ? (isWithinRange ? 'var(--success)' : 'var(--warning)')
    : gps.status === 'error' || gps.status === 'denied'
    ? 'var(--error)'
    : 'var(--text-muted)'

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Mi Asistencia</h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="attendance-grid">
        {/* GPS + Check Card */}
        <div className="check-column">
          {/* Location Selector */}
          {locations.length > 1 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Sede de trabajo
                </label>
                <select
                  id="location-select"
                  className="form-select"
                  value={selectedLocation?.id || ''}
                  onChange={(e) => {
                    const loc = locations.find(l => l.id === e.target.value)
                    setSelectedLocation(loc || null)
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* GPS Status Card */}
          <div className="card gps-card">
            <div className="gps-header">
              <span className="section-title" style={{ marginBottom: 0 }}>Estado de Ubicación</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={startGps}
                disabled={gps.status === 'requesting'}
                aria-label="Actualizar GPS"
              >
                <RefreshCw size={14} className={gps.status === 'requesting' ? 'spinning' : ''} />
                Actualizar
              </button>
            </div>

            {/* GPS Ring Indicator */}
            <div className="gps-visual">
              <div className="gps-rings" style={{ '--gps-color': gpsColor } as React.CSSProperties}>
                {gps.status === 'acquired' && (
                  <>
                    <div className="gps-ring gps-ring-1" />
                    <div className="gps-ring gps-ring-2" />
                  </>
                )}
                <div className="gps-dot">
                  <Navigation size={24} style={{ color: gpsColor }} />
                </div>
              </div>

              <div className="gps-info">
                {gps.status === 'idle' && (
                  <p className="gps-status-text" style={{ color: 'var(--text-muted)' }}>
                    Esperando permiso de ubicación...
                  </p>
                )}
                {gps.status === 'requesting' && (
                  <p className="gps-status-text" style={{ color: 'var(--text-secondary)' }}>
                    <Loader2 size={14} className="spinning" style={{ display: 'inline', marginRight: 6 }} />
                    Obteniendo ubicación...
                  </p>
                )}
                {gps.status === 'acquired' && distance !== null && (
                  <>
                    <div className={`distance-badge ${isWithinRange ? 'in-range' : 'out-range'}`}>
                      {isWithinRange ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                      <span className="distance-value">{Math.round(distance)}m</span>
                      <span className="distance-label">de {selectedLocation?.name || 'la sede'}</span>
                    </div>
                    {gps.accuracy && (
                      <p className="gps-accuracy">
                        Precisión: ±{Math.round(gps.accuracy)}m
                      </p>
                    )}
                  </>
                )}
                {(gps.status === 'error' || gps.status === 'denied') && (
                  <div className="alert alert-error" style={{ marginTop: 0 }}>
                    <XCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{gps.error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Range message */}
            {gps.status === 'acquired' && distance !== null && !isWithinRange && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Estás a <strong>{Math.round(distance)}m</strong> de la sede. Debes estar a menos de{' '}
                  <strong>{selectedLocation?.radius_meters ?? 50}m</strong> para registrar tu asistencia.
                </span>
              </div>
            )}
            {gps.status === 'acquired' && isWithinRange && (
              <div className="alert alert-success">
                <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  ¡Estás dentro del área de trabajo! Puedes registrar tu asistencia.
                </span>
              </div>
            )}
          </div>

          {/* Check In/Out Button Card */}
          <div className="card check-action-card">
            {/* Active session indicator */}
            {activeRecord && (
              <div className="active-session">
                <div className="active-session-indicator">
                  <div className="pulse-dot pulse-dot-success" />
                  <span>Sesión activa</span>
                </div>
                <div className="active-session-info">
                  <div className="active-session-time">
                    <Clock size={14} />
                    <span>Entrada: <strong>{formatTime(activeRecord.check_in_time)}</strong></span>
                  </div>
                  <div className="active-session-elapsed">
                    Tiempo trabajado: <strong>{elapsed}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {message.type === 'success' ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> : <XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Action buttons */}
            {!activeRecord ? (
              <button
                id="check-in-btn"
                className="btn btn-primary btn-lg check-btn"
                onClick={handleCheckIn}
                disabled={
                  loading ||
                  gps.status !== 'acquired' ||
                  !isWithinRange ||
                  !selectedLocation
                }
              >
                {loading ? (
                  <><Loader2 size={20} className="spinning" /> Registrando...</>
                ) : (
                  <><LogIn size={20} /> Registrar Entrada</>
                )}
              </button>
            ) : (
              <button
                id="check-out-btn"
                className="btn btn-accent btn-lg check-btn"
                onClick={handleCheckOut}
                disabled={
                  loading ||
                  gps.status !== 'acquired' ||
                  !isWithinRange
                }
              >
                {loading ? (
                  <><Loader2 size={20} className="spinning" /> Registrando...</>
                ) : (
                  <><LogOut size={20} /> Registrar Salida</>
                )}
              </button>
            )}

            {gps.status !== 'acquired' && (
              <p className="check-hint">
                <MapPin size={12} /> Activa el GPS para registrar tu asistencia
              </p>
            )}
            {gps.status === 'acquired' && !isWithinRange && (
              <p className="check-hint">
                <MapPin size={12} /> Acércate a la sede para habilitar el registro
              </p>
            )}
          </div>
        </div>

        {/* Today's Records */}
        <div className="records-column">
          <div className="card" style={{ height: '100%' }}>
            <div className="section-header">
              <h2 className="section-title" style={{ marginBottom: 0 }}>Registros de Hoy</h2>
              <span className="badge badge-teal">{todayRecords.length}</span>
            </div>

            {todayRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Clock size={28} />
                </div>
                <p>Sin registros hoy</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Registra tu primera entrada del día
                </p>
              </div>
            ) : (
              <div className="records-list">
                {todayRecords.map((record) => (
                  <div key={record.id} className={`record-item ${record.status === 'active' ? 'record-active' : ''}`}>
                    <div className="record-status">
                      {record.status === 'active' ? (
                        <div className="pulse-dot pulse-dot-success" style={{ width: 10, height: 10 }} />
                      ) : (
                        <CheckCircle size={12} style={{ color: 'var(--success)' }} />
                      )}
                    </div>
                    <div className="record-content">
                      <div className="record-times">
                        <div className="record-time-block">
                          <LogIn size={12} style={{ color: 'var(--success)' }} />
                          <span className="record-time-label">Entrada</span>
                          <span className="record-time-value">{formatTime(record.check_in_time)}</span>
                        </div>
                        <div className="record-time-arrow">→</div>
                        <div className="record-time-block">
                          <LogOut size={12} style={{ color: record.check_out_time ? 'var(--orange-400)' : 'var(--text-muted)' }} />
                          <span className="record-time-label">Salida</span>
                          <span className="record-time-value" style={{ color: record.check_out_time ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {record.check_out_time ? formatTime(record.check_out_time) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="record-meta">
                        <span className="badge badge-muted">
                          <Building2 size={10} />
                          {(record as AttendanceRecord & { location?: { name: string } }).location?.name || 'Sede'}
                        </span>
                        {record.duration_minutes && (
                          <span className="badge badge-teal">
                            <Clock size={10} />
                            {formatDuration(record.duration_minutes)}
                          </span>
                        )}
                        {record.status === 'active' && (
                          <span className="badge badge-success">Activo</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .attendance-page { max-width: 1000px; }

        .attendance-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .check-column, .records-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* GPS Card */
        .gps-card { display: flex; flex-direction: column; gap: 1rem; }
        .gps-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .gps-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem 0;
        }
        .gps-rings {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gps-ring {
          position: absolute;
          border-radius: 50%;
          background: var(--gps-color);
          opacity: 0;
        }
        .gps-ring-1 {
          width: 80px;
          height: 80px;
          animation: gps-pulse 2s ease-out infinite;
        }
        .gps-ring-2 {
          width: 80px;
          height: 80px;
          animation: gps-pulse 2s ease-out infinite 0.8s;
        }
        @keyframes gps-pulse {
          0% { transform: scale(0.5); opacity: 0.4; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .gps-dot {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-glass);
          border: 2px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        .gps-info { width: 100%; text-align: center; }
        .gps-status-text { font-size: 0.875rem; }
        .gps-accuracy { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem; }

        .distance-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .in-range {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--success);
        }
        .out-range {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: var(--warning);
        }
        .distance-value { font-size: 1.2rem; }
        .distance-label { font-size: 0.8rem; font-weight: 400; color: inherit; opacity: 0.8; }

        /* Check action card */
        .check-action-card { display: flex; flex-direction: column; gap: 1rem; }
        .check-btn {
          width: 100%;
          justify-content: center;
          font-size: 1rem;
          padding: 1rem;
        }
        .check-hint {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          justify-content: center;
        }

        /* Active session */
        .active-session {
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .active-session-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--success);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .active-session-info { display: flex; flex-direction: column; gap: 0.3rem; }
        .active-session-time {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .active-session-elapsed {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* Records list */
        .records-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .record-item {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition);
        }
        .record-active {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.04);
        }
        .record-status {
          padding-top: 0.25rem;
          flex-shrink: 0;
        }
        .record-content { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
        .record-times {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .record-time-block {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
        }
        .record-time-label { color: var(--text-muted); }
        .record-time-value { font-weight: 600; color: var(--text-primary); }
        .record-time-arrow { color: var(--text-muted); font-size: 0.8rem; }
        .record-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }

        .spinning {
          animation: spin 0.8s linear infinite;
        }

        @media (max-width: 768px) {
          .attendance-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
