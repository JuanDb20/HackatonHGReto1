'use client'

import { useEffect, useState, useCallback } from 'react'
import { parseFechaISO, diasCalendarioRestantes, formatFechaLegible } from '@/lib/diasHabilesCo'

interface UserInfo {
  nombre: string
  cargo: string
  foto_url: string | null
}

interface CasoRow {
  id: number
  demandante: string | null
  demandado: string | null
  radicado: string | null
  juzgado: string | null
  tipo_proceso: string | null
  fecha_notificacion: string | null
  termino_dias: number | null
  fecha_vencimiento: string | null
  seguimiento_activo: boolean
  estado: 'pendiente' | 'contestado' | 'archivado'
  created_at: string
}

function urgencia(diasRestantes: number | null): { color: string; bg: string; texto: string } {
  if (diasRestantes === null) return { color: '#6b7280', bg: '#f5f5f5', texto: 'Sin fecha' }
  if (diasRestantes < 0) return { color: '#991b1b', bg: '#fef2f2', texto: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}` }
  if (diasRestantes === 0) return { color: '#991b1b', bg: '#fef2f2', texto: 'Vence hoy' }
  if (diasRestantes === 1) return { color: '#991b1b', bg: '#fef2f2', texto: 'Vence mañana' }
  if (diasRestantes <= 2) return { color: '#991b1b', bg: '#fef2f2', texto: `${diasRestantes} días` }
  if (diasRestantes <= 5) return { color: '#92400e', bg: '#fffbeb', texto: `${diasRestantes} días` }
  return { color: '#15803d', bg: '#f0fdf4', texto: `${diasRestantes} días` }
}

export default function TerminosPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [casos, setCasos] = useState<CasoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'activos' | 'historial'>('activos')
  const [actualizando, setActualizando] = useState<number | null>(null)

  const cargarCasos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/casos')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los casos.')
      setCasos(json.casos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setUser(d) }).catch(() => {})
    cargarCasos()
  }, [cargarCasos])

  const cambiarEstado = async (id: number, estado: 'contestado' | 'archivado' | 'pendiente') => {
    setActualizando(id)
    try {
      const res = await fetch(`/api/casos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) throw new Error('No se pudo actualizar el caso.')
      await cargarCasos()
    } catch {
      setError('No se pudo actualizar el caso. Intenta de nuevo.')
    } finally {
      setActualizando(null)
    }
  }

  const activos = casos.filter(c => c.seguimiento_activo && c.estado === 'pendiente')
  const historial = casos.filter(c => !c.seguimiento_activo || c.estado !== 'pendiente')
  const visibles = filtro === 'activos' ? activos : historial

  const conAlertaUrgente = activos.filter(c => {
    const f = parseFechaISO(c.fecha_vencimiento)
    return f && diasCalendarioRestantes(f) <= 2
  }).length

  return (
    <div className="min-h-screen" style={{ background: 'var(--hg-black)' }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(10,10,10,0.96)', borderBottom: '1px solid #1a1a1a' }}
      >
        <a href="/inicio" className="flex items-center gap-5">
          <img src="/logo-hg.webp" alt="Hurtado Gandini" height={32} style={{ height: 32, width: 'auto', display: 'block' }} />
          <div className="hidden sm:block h-6 w-px" style={{ background: '#2a2a2a' }} />
          <div className="hidden sm:block">
            <div className="font-black text-white tracking-widest uppercase text-sm">LITIGIA</div>
            <div className="text-xs uppercase tracking-widest" style={{ color: '#4b5563', fontSize: '0.6rem' }}>Términos</div>
          </div>
        </a>
        <nav className="flex items-center gap-6">
          <a href="/inicio" className="text-xs font-semibold uppercase tracking-widest transition-colors" style={{ color: '#6b7280' }}>
            Generar contestación
          </a>
          <a href="/dashboard" className="text-xs font-semibold uppercase tracking-widest transition-colors" style={{ color: '#6b7280' }}>
            Impacto económico
          </a>
          {user && (
            <div
              className="flex items-center justify-center font-black text-white"
              style={{
                width: 28,
                height: 28,
                minWidth: 28,
                maxWidth: 28,
                minHeight: 28,
                maxHeight: 28,
                overflow: 'hidden',
                flexShrink: 0,
                background: user.foto_url ? 'transparent' : 'var(--hg-red)',
                fontSize: '0.55rem',
                borderRadius: user.foto_url ? '50%' : 0,
              }}
              title={user.nombre}
            >
              {user.foto_url
                ? <img src={user.foto_url} alt="" style={{ width: 28, height: 28, display: 'block', objectFit: 'cover' }} />
                : user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
          )}
        </nav>
      </header>

      <div className="pt-28 pb-20 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hg-red)' }}>Seguimiento de plazos</div>
              <h1 className="font-black text-3xl" style={{ color: 'white', letterSpacing: '-0.02em' }}>Términos y vencimientos</h1>
              {conAlertaUrgente > 0 && (
                <p className="text-sm mt-2" style={{ color: '#f87171' }}>
                  {conAlertaUrgente} caso{conAlertaUrgente > 1 ? 's' : ''} con vencimiento en 2 días hábiles o menos.
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            {(['activos', 'historial'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className="text-xs font-black uppercase tracking-widest px-4 py-2 transition-colors"
                style={{
                  color: filtro === f ? 'white' : '#6b7280',
                  borderBottom: `2px solid ${filtro === f ? 'var(--hg-red)' : 'transparent'}`,
                }}
              >
                {f === 'activos' ? `Con seguimiento (${activos.length})` : `Historial (${historial.length})`}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm" style={{ color: '#6b7280' }}>Cargando casos...</p>}
          {error && <p className="text-sm mb-4" style={{ color: '#f87171' }}>{error}</p>}

          {!loading && visibles.length === 0 && (
            <div className="px-6 py-10 text-center" style={{ background: '#111111', border: '1px solid #1a1a1a' }}>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {filtro === 'activos'
                  ? 'No tienes casos con seguimiento de términos activo. Genera una contestación y usa el botón "Agregar seguimiento de términos" en el editor.'
                  : 'No hay casos en el historial todavía.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {visibles.map(caso => {
              const fechaVenc = parseFechaISO(caso.fecha_vencimiento)
              const dias = filtro === 'activos' && fechaVenc ? diasCalendarioRestantes(fechaVenc) : null
              const u = filtro === 'activos' ? urgencia(dias) : urgencia(null)

              return (
                <div key={caso.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap" style={{ background: '#111111', border: '1px solid #1a1a1a' }}>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/editor?casoId=${caso.id}`}
                      className="text-sm font-semibold text-white truncate hover:underline"
                      style={{ display: 'inline-block' }}
                      title="Abrir el borrador de contestación de este caso"
                    >
                      {caso.demandado || 'Demandado sin nombre'} <span style={{ color: '#4b5563' }}>vs.</span> {caso.demandante || 'Demandante sin nombre'}
                    </a>
                    <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: '#6b7280' }}>
                      {caso.radicado && <span>Rad. {caso.radicado}</span>}
                      {caso.juzgado && <span>· {caso.juzgado}</span>}
                      {caso.tipo_proceso && <span>· {caso.tipo_proceso}</span>}
                      {caso.estado !== 'pendiente' && (
                        <span className="uppercase font-black tracking-widest" style={{ color: caso.estado === 'contestado' ? '#4ade80' : '#6b7280' }}>
                          · {caso.estado}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {filtro === 'activos' && (
                      <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5" style={{ background: u.bg, color: u.color }}>
                        {u.texto}
                      </span>
                    )}
                    {formatFechaLegible(caso.fecha_vencimiento) && (
                      <span className="text-xs" style={{ color: '#4b5563' }}>
                        Vence {formatFechaLegible(caso.fecha_vencimiento)}
                      </span>
                    )}
                    {filtro === 'activos' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => cambiarEstado(caso.id, 'contestado')}
                          disabled={actualizando === caso.id}
                          className="text-xs font-black uppercase tracking-widest px-3 py-1.5 text-white"
                          style={{ background: '#16a34a', opacity: actualizando === caso.id ? 0.6 : 1 }}
                        >
                          Contestado
                        </button>
                        <button
                          onClick={() => cambiarEstado(caso.id, 'archivado')}
                          disabled={actualizando === caso.id}
                          className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5"
                          style={{ color: '#6b7280', border: '1px solid #2a2a2a', opacity: actualizando === caso.id ? 0.6 : 1 }}
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
