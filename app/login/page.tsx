'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">
            {/* Logo SVG Medisystem */}
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <rect width="56" height="56" rx="16" fill="rgba(0,109,109,0.15)"/>
              <path d="M14 20C14 20 18 14 22 18C26 22 22 26 26 26C30 26 26 30 30 28C34 26 30 34 34 38" 
                stroke="#E8440A" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 38C20 38 24 32 28 32C32 32 28 26 32 24" 
                stroke="#006D6D" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="login-brand-name">
              <span style={{color: 'var(--orange-500)'}}>Medi</span>
              <span style={{color: 'var(--teal-400)'}}>System</span>
            </h1>
            <p className="login-brand-sub">Control de Asistencia GPS</p>
          </div>
        </div>

        <div className="login-hero">
          <h2 className="login-hero-title">
            Gestiona la asistencia<br />
            <span className="gradient-text">con precisión GPS</span>
          </h2>
          <p className="login-hero-desc">
            Sistema inteligente de control de asistencia que valida 
            la presencia del personal con geolocalización en tiempo real.
          </p>
          
          <div className="login-features">
            {[
              { icon: '📍', label: 'Validación GPS a 50m' },
              { icon: '⚡', label: 'Check-in en segundos' },
              { icon: '📊', label: 'Dashboard en tiempo real' },
              { icon: '🏢', label: 'Multi-sede' },
            ].map((f) => (
              <div key={f.label} className="login-feature-chip">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Iniciar sesión</h2>
            <p className="login-card-sub">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="usuario@medisystem.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? (
                <><div className="spinner" /> Ingresando...</>
              ) : (
                <><LogIn size={18} /> Ingresar al sistema</>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>¿Problemas para ingresar? Contacta al administrador del sistema.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .login-left {
          padding: 3rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          background: linear-gradient(135deg, rgba(0,109,109,0.08) 0%, transparent 60%);
          border-right: 1px solid var(--border-subtle);
        }
        .login-brand {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }
        .login-logo {
          flex-shrink: 0;
        }
        .login-brand-name {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .login-brand-sub {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.1rem;
        }
        .login-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1.5rem;
        }
        .login-hero-title {
          font-size: 2.4rem;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--teal-400), var(--orange-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-hero-desc {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.6;
          max-width: 420px;
        }
        .login-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .login-feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.875rem;
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          border-radius: 999px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .login-right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: 2.5rem;
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow-lg);
        }
        .login-card-header {
          margin-bottom: 2rem;
        }
        .login-card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .login-card-sub {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-top: 0.3rem;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .password-wrapper {
          position: relative;
        }
        .password-wrapper .form-input {
          width: 100%;
          padding-right: 2.75rem;
        }
        .password-toggle {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: color var(--transition);
        }
        .password-toggle:hover {
          color: var(--text-secondary);
        }
        .login-footer {
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-subtle);
          text-align: center;
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        @media (max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left { display: none; }
        }
      `}</style>
    </div>
  )
}
