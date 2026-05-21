'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, AttendanceRecord, formatTime, formatDate, formatDuration, getInitials } from '@/lib/utils'
import {
  FileBarChart,
  Search,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Building2,
  Users,
  Download,
  Filter,
  X,
} from 'lucide-react'

type RecordWithDetails = AttendanceRecord & {
  profile: Pick<Profile, 'full_name' | 'employee_code' | 'department'>
  location: { name: string }
}

export default function ReportsPage() {
  const supabase = createClient()
  const [records, setRecords] = useState<RecordWithDetails[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const today = new Date().toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [employeeId, setEmployeeId] = useState('')

  useEffect(() => {
    // Load employees for filter
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => { if (data) setEmployees(data) })

    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        profile:profiles(full_name, employee_code, department),
        location:locations(name)
      `)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('check_in_time', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data } = await query
    if (data) setRecords(data as RecordWithDetails[])
    setLoading(false)
  }

  const handleExportExcel = () => {
    const headers = ['Empleado', 'Código', 'Departamento', 'Sede', 'Fecha', 'Entrada', 'Salida', 'Duración (min)', 'Estado']
    const rows = records.map(r => [
      r.profile?.full_name || '',
      r.profile?.employee_code || '',
      r.profile?.department || '',
      r.location?.name || '',
      r.date.split('-').reverse().join('/'),
      formatTime(r.check_in_time),
      r.check_out_time ? formatTime(r.check_out_time) : '',
      r.duration_minutes || '',
      r.status === 'active' ? 'Activo' : 'Completado',
    ])

    // Dynamic import to keep bundle size small
    import('xlsx').then((XLSX) => {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      
      // Auto-size columns slightly
      const wscols = headers.map(() => ({ wch: 18 }))
      worksheet['!cols'] = wscols
      
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencia')
      XLSX.writeFile(workbook, `Asistencia_Medisystem_${dateFrom}_al_${dateTo}.xlsx`)
    })
  }

  // Summary stats
  const totalHours = records
    .filter(r => r.duration_minutes)
    .reduce((acc, r) => acc + (r.duration_minutes || 0), 0)
  const uniqueEmployees = new Set(records.map(r => r.employee_id)).size
  const avgDuration = records.filter(r => r.duration_minutes).length > 0
    ? Math.round(totalHours / records.filter(r => r.duration_minutes).length)
    : 0

  return (
    <div className="reports-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Historial de asistencia del personal</p>
        </div>
        {records.length > 0 && (
          <button id="export-excel-btn" className="btn btn-ghost" onClick={handleExportExcel}>
            <Download size={16} />
            Exportar Excel
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-row">
          <div className="form-group">
            <label className="form-label">
              <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
              Desde
            </label>
            <input
              id="filter-date-from"
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
              Hasta
            </label>
            <input
              id="filter-date-to"
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">
              <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
              Empleado
            </label>
            <select
              id="filter-employee"
              className="form-select"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
            >
              <option value="">Todos</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <button id="apply-filter-btn" className="btn btn-primary" onClick={loadRecords} disabled={loading}>
              <Filter size={15} />
              Filtrar
            </button>
            {(employeeId || dateFrom !== today || dateTo !== today) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setDateFrom(today); setDateTo(today); setEmployeeId('') }}
              >
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {records.length > 0 && (
        <div className="stats-grid">
          {[
            { icon: Clock, value: records.length, label: 'Registros', iconClass: 'stat-icon-teal' },
            { icon: Users, value: uniqueEmployees, label: 'Empleados únicos', iconClass: 'stat-icon-orange' },
            { icon: FileBarChart, value: formatDuration(totalHours), label: 'Horas totales', iconClass: 'stat-icon-success' },
            { icon: Clock, value: formatDuration(avgDuration), label: 'Duración promedio', iconClass: 'stat-icon-warning' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-icon ${s.iconClass}`}><s.icon size={20} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Registros</h2>
          <span className="badge badge-muted">{records.length}</span>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileBarChart size={28} /></div>
            <p>Sin registros para los filtros seleccionados</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Sede</th>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Duración</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div className="avatar avatar-sm avatar-teal">
                          {getInitials(record.profile?.full_name || 'EM')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{record.profile?.full_name}</div>
                          {record.profile?.department && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{record.profile.department}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-muted">
                        <Building2 size={11} /> {record.location?.name}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(record.date + 'T12:00:00').toLocaleDateString('es-VE', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
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
                      {formatDuration(record.duration_minutes)}
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
        .reports-page {}
        .filters-card { margin-bottom: 1.5rem; }
        .filters-row {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .filter-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
      `}</style>
    </div>
  )
}
