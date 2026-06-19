'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--hg-black)' }}
    >
      {/* Grid de fondo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.25,
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo y encabezado */}
        <div className="text-center mb-10">
          <img
            src="/logo-hg.webp"
            alt="Hurtado Gandini"
            style={{ height: 34, width: 'auto', margin: '0 auto' }}
          />
          <div className="mt-6 mb-2 font-black text-white text-base tracking-widest uppercase">
            LitigIA
          </div>
          <div className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>
            Acceso exclusivo — plataforma interna
          </div>
        </div>

        {/* Tarjeta */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          {/* Barra roja superior */}
          <div style={{ background: 'var(--hg-red)', height: 3 }} />

          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-black uppercase tracking-widest mb-2"
                style={{ color: '#6b7280' }}
              >
                Correo institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@hgdsas.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  color: 'white',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--hg-red)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                className="block text-xs font-black uppercase tracking-widest mb-2"
                style={{ color: '#6b7280' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 text-sm outline-none transition-colors"
                  style={{
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    color: 'white',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--hg-red)')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-widest"
                  style={{ color: '#4b5563' }}
                >
                  {showPass ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-4 py-3 text-xs"
                style={{
                  background: '#1a0808',
                  color: '#fca5a5',
                  border: '1px solid #7f1d1d',
                }}
              >
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-black text-white text-xs uppercase tracking-widest transition-opacity mt-1"
              style={{
                background: loading ? '#3a0a0a' : 'var(--hg-red)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = 'var(--hg-red-hover)'
              }}
              onMouseLeave={e => {
                if (!loading) e.currentTarget.style.background = 'var(--hg-red)'
              }}
            >
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#2a2a2a' }}>
          Uso exclusivo para abogados de Hurtado Gandini S.A.S.
          <br />
          No se aceptan registros externos.
        </p>
        <div className="text-center mt-3">
          <a href="/" className="text-xs uppercase tracking-widest transition-colors" style={{ color: '#2a2a2a' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#4b5563')}
            onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
          >
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
}
