'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AttendanceRecord,
  Profile,
  formatTime,
  formatDuration,
  getInitials,
  getElapsedTime,
} from '@/lib/utils'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  LogIn,
  LogOut,
  Building2,
  Activity,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const WorkplaceMap = dynamic(() => import('@/components/dashboard/WorkplaceMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      Cargando mapa...
    </div>
  ),
})

type RecordWithProfile = AttendanceRecord & {
  profile: Pick<Profile, 'full_name' | 'employee_code' | 'department'>
  location: { name: string }
}

export default function DashboardPage() {
  const supabase = createClient()
  const [records, setRecords] = useState<RecordWithProfile[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [elapsed, setElapsed] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]

  const loadData = async () => {
    // Today's records with profile info
    const { data } = await supabase
      .from('attendance_records')
      .select(`
        *,
        profile:profiles(full_name, employee_code, department),
        location:locations(name)
      `)
      .eq('date', today)
      .order('check_in_time', { ascending: false })

    if (data) setRecords(data as RecordWithProfile[])

    // Total employees
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('role', 'employee')

    setTotalEmployees(count || 0)
    setLoading(false)
    setLastUpdate(new Date())
  }

  // Elapsed timers for active sessions
  useEffect(() => {
    const update = () => {
      const updated: Record<string, string> = {}
      records.filter(r => r.status === 'active').forEach(r => {
        updated[r.id] = getElapsedTime(r.check_in_time)
      })
      setElapsed(updated)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [records])

  useEffect(() => {
    loadData()

    // Realtime subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => loadData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Stats
  const activeNow = records.filter(r => r.status === 'active').length
  const completedToday = records.filter(r => r.status === 'completed').length
  const absentToday = Math.max(0, totalEmployees - records.length)
  const avgDuration = records.filter(r => r.duration_minutes).reduce((acc, r) => acc + (r.duration_minutes || 0), 0) / (completedToday || 1)

  const stats = [
    {
      id: 'stat-active',
      icon: UserCheck,
      value: activeNow,
      label: 'Activos ahora',
      iconClass: 'stat-icon-success',
    },
    {
      id: 'stat-absent',
      icon: UserX,
      value: absentToday,
      label: 'Sin registrar hoy',
      iconClass: 'stat-icon-orange',
    },
    {
      id: 'stat-total',
      icon: Users,
      value: records.length,
      label: 'Registros hoy',
      iconClass: 'stat-icon-teal',
    },
    {
      id: 'stat-avg',
      icon: TrendingUp,
      value: completedToday > 0 ? formatDuration(Math.round(avgDuration)) : '—',
      label: 'Duración promedio',
      iconClass: 'stat-icon-warning',
    },
  ]

  const activeRecords = records.filter(r => r.status === 'active')
  const allRecords = records

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
            {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="realtime-badge">
            <div className="pulse-dot pulse-dot-success" />
            En vivo
          </div>
          <button
            id="refresh-dashboard"
            className="btn btn-ghost btn-sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div id={s.id} key={s.id} className="stat-card fade-in">
            <div className={`stat-icon ${s.iconClass}`}>
              <s.icon size={22} />
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Active Now Panel */}
        <div className="card active-panel">
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--success)' }} />
              <h2 className="section-title" style={{ marginBottom: 0 }}>Personal Activo</h2>
            </div>
            <span className="badge badge-success">{activeNow} en línea</span>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : activeRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={28} /></div>
              <p>No hay personal activo en este momento</p>
            </div>
          ) : (
            <div className="active-list">
              {activeRecords.map((record) => (
                <div key={record.id} className="active-item fade-in">
                  <div className="avatar avatar-md avatar-teal">
                    {getInitials(record.profile?.full_name || 'EM')}
                  </div>
                  <div className="active-item-info">
                    <div className="active-item-name">{record.profile?.full_name}</div>
                    <div className="active-item-meta">
                      <Building2 size={11} />
                      {record.location?.name}
                    </div>
                  </div>
                  <div className="active-item-right">
                    <div className="active-item-time">
                      <LogIn size={11} style={{ color: 'var(--success)' }} />
                      {formatTime(record.check_in_time)}
                    </div>
                    <div className="active-item-elapsed">{elapsed[record.id] || '—'}</div>
                  </div>
                  <div className="pulse-dot pulse-dot-success" style={{ width: 8, height: 8, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="card map-panel">
          <div className="section-header">
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              <Building2 size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--teal-400)' }} />
              Mapa de Sede
            </h2>
            <span className="badge badge-teal">El Cementerio</span>
          </div>
          <div className="map-container">
            <WorkplaceMap activeCount={activeNow} />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="section-header">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Registros del Día</h2>
          <span className="badge badge-muted">{allRecords.length} registros</span>
        </div>

        {allRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Clock size={28} /></div>
            <p>Sin registros hoy</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Sede</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Duración</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {allRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="avatar avatar-sm avatar-teal">
                          {getInitials(record.profile?.full_name || 'EM')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {record.profile?.full_name}
                          </div>
                          {record.profile?.department && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {record.profile.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-muted">
                        <Building2 size={11} />
                        {record.location?.name}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem' }}>
                        <LogIn size={13} style={{ color: 'var(--success)' }} />
                        {formatTime(record.check_in_time)}
                      </div>
                    </td>
                    <td>
                      {record.check_out_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem' }}>
                          <LogOut size={13} style={{ color: 'var(--orange-400)' }} />
                          {formatTime(record.check_out_time)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {record.status === 'active'
                        ? <span style={{ color: 'var(--success)' }}>{elapsed[record.id] || '...'}</span>
                        : formatDuration(record.duration_minutes)
                      }
                    </td>
                    <td>
                      <span className={`badge ${record.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                        {record.status === 'active' ? 'Activo' : 'Completado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-page { }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .active-panel { display: flex; flex-direction: column; }
        .active-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .active-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: var(--bg-glass);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition);
        }
        .active-item:hover {
          border-color: rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.04);
        }
        .active-item-info { flex: 1; min-width: 0; }
        .active-item-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .active-item-meta {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.2rem;
        }
        .active-item-right { text-align: right; flex-shrink: 0; }
        .active-item-time {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          justify-content: flex-end;
        }
        .active-item-elapsed {
          font-size: 0.75rem;
          color: var(--success);
          font-weight: 600;
          margin-top: 0.1rem;
        }
        .map-panel { display: flex; flex-direction: column; }
        .map-container {
          border-radius: var(--radius-md);
          overflow: hidden;
          flex: 1;
          min-height: 300px;
        }
        .spinning { animation: spin 0.8s linear infinite; }

        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
