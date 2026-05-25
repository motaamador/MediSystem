'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clock,
  Users,
  FileBarChart,
  MapPin,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Menu,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

interface SidebarProps {
  profile: Profile
}

const adminNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/employees', icon: Users, label: 'Empleados' },
  { href: '/locations', icon: MapPin, label: 'Sedes' },
  { href: '/reports', icon: FileBarChart, label: 'Reportes' },
]

const employeeNavItems = [
  { href: '/attendance', icon: Clock, label: 'Mi Asistencia' },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const navItems = profile.role === 'admin' ? adminNavItems : employeeNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="mobile-toggle" 
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          {!collapsed && (
            <div className="sidebar-brand">
              <div className="sidebar-logo-icon">
                <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <span className="brand-medi">Medi</span>
                <span className="brand-system">System</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="sidebar-logo-icon-only">
              <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="sidebar-role">
            <Building2 size={12} />
            <span>{profile.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && <div className="sidebar-link-dot" />}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="sidebar-footer">
          <div className={`sidebar-user ${collapsed ? 'sidebar-user-collapsed' : ''}`}>
            <div
              className="avatar avatar-md avatar-teal"
              title={profile.full_name}
            >
              {getInitials(profile.full_name)}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{profile.full_name}</span>
                <span className="sidebar-user-email">{profile.department || profile.role}</span>
              </div>
            )}
          </div>
          <button
            id="logout-btn"
            className={`sidebar-logout ${collapsed ? 'sidebar-logout-collapsed' : ''}`}
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: var(--sidebar-width);
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          z-index: 200;
          transition: width var(--transition-slow), transform var(--transition-slow);
          overflow: hidden;
        }
        .sidebar-collapsed {
          width: var(--sidebar-collapsed);
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border-subtle);
          min-height: 72px;
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sidebar-logo-icon {
          width: 40px;
          height: 40px;
          background: rgba(0,109,109,0.12);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sidebar-logo-icon-only {
          width: 40px;
          height: 40px;
          background: rgba(0,109,109,0.12);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .brand-medi {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--orange-500);
          letter-spacing: -0.02em;
        }
        .brand-system {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--teal-400);
          letter-spacing: -0.02em;
        }
        .sidebar-collapse-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition);
          flex-shrink: 0;
        }
        .sidebar-collapse-btn:hover {
          background: var(--bg-glass-hover);
          color: var(--teal-400);
        }
        .sidebar-role {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1.25rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--teal-400);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 1px solid var(--border-subtle);
        }
        .sidebar-nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.875rem;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition);
          position: relative;
          white-space: nowrap;
        }
        .sidebar-link:hover {
          color: var(--text-primary);
          background: var(--bg-glass);
        }
        .sidebar-link-active {
          color: var(--teal-400) !important;
          background: rgba(0, 109, 109, 0.12) !important;
        }
        .sidebar-link-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--teal-400);
          margin-left: auto;
          margin-top: -1px;
        }
        .sidebar-footer {
          padding: 0.75rem;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.625rem;
          border-radius: var(--radius-md);
        }
        .sidebar-user-collapsed {
          justify-content: center;
        }
        .sidebar-user-info {
          flex: 1;
          min-width: 0;
        }
        .sidebar-user-name {
          display: block;
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-email {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: capitalize;
        }
        .sidebar-logout {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.625rem 0.875rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 500;
          transition: all var(--transition);
          width: 100%;
        }
        .sidebar-logout-collapsed {
          justify-content: center;
        }
        .sidebar-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }
      `}</style>
    </>
  )
}
