// ── Types ─────────────────────────────────────────────────────

export type UserRole = 'admin' | 'employee'

export interface Profile {
  id: string
  full_name: string
  employee_code: string | null
  department: string | null
  position: string | null
  role: UserRole
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  location_id: string
  check_in_time: string
  check_out_time: string | null
  check_in_lat: number
  check_in_lon: number
  check_out_lat: number | null
  check_out_lon: number | null
  status: 'active' | 'completed'
  duration_minutes: number | null
  date: string
  notes: string | null
  created_at: string
  // Joined
  profile?: Profile
  location?: Location
}

// ── Helpers ───────────────────────────────────────────────────

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function getElapsedTime(checkInTime: string): string {
  const diff = Date.now() - new Date(checkInTime).getTime()
  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
