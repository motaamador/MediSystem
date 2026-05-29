'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Shift, getInitials } from '@/lib/utils'
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit3,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

interface EmployeeForm {
  full_name: string
  email: string
  password: string
  employee_code: string
  department: string
  position: string
  phone: string
  role: 'employee' | 'admin'
  shift_id: string
}

const EMPTY_FORM: EmployeeForm = {
  full_name: '',
  email: '',
  password: '',
  employee_code: '',
  department: '',
  position: '',
  phone: '',
  role: 'employee',
  shift_id: '',
}

export default function EmployeesPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Profile | null>(null)
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadEmployees = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    if (data) {
      setEmployees(data)
      setFiltered(data)
    }
    setLoading(false)
  }

  const loadShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .order('name')
    if (data) {
      setShifts(data)
    }
  }

  useEffect(() => {
    loadEmployees()
    loadShifts()
  }, [])

  // Filter
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      employees.filter(e =>
        e.full_name.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q)
      )
    )
  }, [search, employees])

  const openCreate = () => {
    setEditEmployee(null)
    setForm(EMPTY_FORM)
    setMessage(null)
    setShowModal(true)
  }

  const openEdit = (emp: Profile) => {
    setEditEmployee(emp)
    setForm({
      full_name: emp.full_name,
      email: '',
      password: '',
      employee_code: emp.employee_code || '',
      department: emp.department || '',
      position: emp.position || '',
      phone: emp.phone || '',
      role: emp.role as 'employee' | 'admin',
      shift_id: emp.shift_id || '',
    })
    setMessage(null)
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (editEmployee) {
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          employee_code: form.employee_code || null,
          department: form.department || null,
          position: form.position || null,
          phone: form.phone || null,
          role: form.role,
          shift_id: form.shift_id || null,
        })
        .eq('id', editEmployee.id)

      if (error) {
        setMessage({ type: 'error', text: 'Error al actualizar el empleado.' })
      } else {
        setMessage({ type: 'success', text: 'Empleado actualizado exitosamente.' })
        await loadEmployees()
        setTimeout(() => setShowModal(false), 1000)
      }
    } else {
      // Create new user via Supabase admin API (uses service role on server)
      const res = await fetch('/api/employees/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al crear el empleado.' })
      } else {
        setMessage({ type: 'success', text: 'Empleado creado exitosamente.' })
        await loadEmployees()
        setTimeout(() => setShowModal(false), 1000)
      }
    }

    setSaving(false)
  }

  const toggleActive = async (emp: Profile) => {
    await supabase
      .from('profiles')
      .update({ is_active: !emp.is_active })
      .eq('id', emp.id)
    await loadEmployees()
  }

  const totalActive = employees.filter(e => e.is_active).length
  const totalAdmin = employees.filter(e => e.role === 'admin').length

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">{totalActive} activos · {totalAdmin} admin · {employees.length} total</p>
        </div>
        <button id="create-employee-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Nuevo empleado
        </button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Search size={16} style={{ color: 'var(--text-muted)' }} />
        <input
          id="employee-search"
          type="text"
          className="form-input"
          placeholder="Buscar por nombre, departamento o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0.5rem 0' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={28} /></div>
          <p>{search ? 'Sin resultados para tu búsqueda' : 'No hay empleados registrados'}</p>
          {!search && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> Agregar primero
            </button>
          )}
        </div>
      ) : (
        <div className="employees-grid">
          {filtered.map(emp => (
            <div key={emp.id} className={`employee-card card card-hover ${!emp.is_active ? 'inactive' : ''}`}>
              <div className="employee-card-header">
                <div className={`avatar avatar-lg ${emp.role === 'admin' ? 'avatar-orange' : 'avatar-teal'}`}>
                  {getInitials(emp.full_name)}
                </div>
                <div className="employee-badges">
                  <span className={`badge ${emp.role === 'admin' ? 'badge-orange' : 'badge-teal'}`}>
                    {emp.role === 'admin' ? 'Admin' : 'Empleado'}
                  </span>
                  <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-error'}`}>
                    {emp.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div className="employee-info">
                <h3 className="employee-name">{emp.full_name}</h3>
                {emp.position && <p className="employee-position">{emp.position}</p>}
                {emp.department && <p className="employee-dept">{emp.department}</p>}
                {emp.employee_code && (
                  <p className="employee-code">
                    <span>#</span>{emp.employee_code}
                  </p>
                )}
                <p className="employee-shift" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>🕒</span>
                  <span>{shifts.find(s => s.id === emp.shift_id)?.name || 'Sin turno asignado'}</span>
                </p>
              </div>
              <div className="employee-actions">
                <button
                  id={`edit-emp-${emp.id}`}
                  className="btn btn-ghost btn-sm"
                  onClick={() => openEdit(emp)}
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  id={`toggle-emp-${emp.id}`}
                  className={`btn btn-sm ${emp.is_active ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={() => toggleActive(emp)}
                >
                  {emp.is_active
                    ? <><UserX size={14} /> Desactivar</>
                    : <><UserCheck size={14} /> Activar</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <button
                id="close-modal-btn"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowModal(false)}
                style={{ padding: '0.4rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input
                    id="emp-fullname"
                    className="form-input"
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    required
                    placeholder="Ej: María González"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Código de empleado</label>
                  <input
                    id="emp-code"
                    className="form-input"
                    value={form.employee_code}
                    onChange={e => setForm({ ...form, employee_code: e.target.value })}
                    placeholder="Ej: EMP-001"
                  />
                </div>
              </div>

              {!editEmployee && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      id="emp-email"
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                      placeholder="correo@medisystem.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contraseña inicial *</label>
                    <input
                      id="emp-password"
                      type="password"
                      className="form-input"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <input
                    id="emp-department"
                    className="form-input"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="Ej: Laboratorio"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo</label>
                  <input
                    id="emp-position"
                    className="form-input"
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                    placeholder="Ej: Enfermero"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    id="emp-phone"
                    className="form-input"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ej: 0412-1234567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select
                    id="emp-role"
                    className="form-select"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value as 'employee' | 'admin' })}
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Turno de Trabajo</label>
                <select
                  id="emp-shift"
                  className="form-select"
                  value={form.shift_id}
                  onChange={e => setForm({ ...form, shift_id: e.target.value })}
                >
                  <option value="">-- Sin turno asignado --</option>
                  {shifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
                </select>
              </div>

              {message && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {message.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button id="save-employee-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="spinning" /> Guardando...</> : 'Guardar empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .employees-page {}
        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
        }
        .employees-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .employee-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .employee-card.inactive {
          opacity: 0.55;
        }
        .employee-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .employee-badges {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          align-items: flex-end;
        }
        .employee-info { flex: 1; }
        .employee-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .employee-position {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.2rem;
        }
        .employee-dept {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.1rem;
        }
        .employee-code {
          font-size: 0.75rem;
          color: var(--teal-400);
          font-family: monospace;
          margin-top: 0.35rem;
        }
        .employee-actions {
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
