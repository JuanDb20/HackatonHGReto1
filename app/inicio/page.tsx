'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DEMANDA_EJEMPLO } from '@/lib/prompts'
import { formatFechaLegible } from '@/lib/diasHabilesCo'

interface UserInfo {
  nombre: string
  cargo: string
  tarjeta_profesional: string | null
  foto_url: string | null
}

interface AlertaCaso {
  id: number
  demandante: string | null
  demandado: string | null
  fecha_vencimiento: string
}

const LOADING_STEPS = [
  'Leyendo la demanda civil...',
  'Identificando partes y pretensiones...',
  'Clasificando tipo de proceso y términos...',
  'Seleccionando estrategia defensiva...',
  'Redactando borrador de contestación...',
  'Verificando estructura CGP...',
]

export default function InicioPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [alertasVencimiento, setAlertasVencimiento] = useState<AlertaCaso[]>([])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/casos/alertas?dias=2')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.alertas) setAlertasVencimiento(data.alertas) })
      .catch(() => {})
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped)
      setError(null)
    } else {
      setError('Solo se aceptan archivos PDF.')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) { setFile(selected); setError(null) }
  }

  const startLoadingSteps = () => {
    const delays = [0, 4000, 9000, 14000, 20000, 28000]
    delays.forEach((delay, i) => setTimeout(() => setLoadingStep(i), delay))
  }

  const generarContestacion = async (modoDemo = false) => {
    setLoading(true)
    setLoadingStep(0)
    setError(null)
    startLoadingSteps()

    try {
      const formData = new FormData()
      if (modoDemo) {
        formData.append('texto', DEMANDA_EJEMPLO)
      } else if (file) {
        formData.append('pdf', file)
      } else {
        setError('Selecciona un PDF primero.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/generar', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar la contestación')

      localStorage.setItem('litigia_contestacion', JSON.stringify(data))
      const count = parseInt(localStorage.getItem('litigia_count') || '127') + 1
      localStorage.setItem('litigia_count', String(count))
      router.push('/editor')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--hg-black)' }}>
        <HGLogo height={38} />
        <div className="mt-12 w-full max-w-sm">
          <div className="h-1 rounded-full overflow-hidden mb-8" style={{ background: '#1a1a1a' }}>
            <div
              className="h-full rounded-full transition-all duration-[3000ms]"
              style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%`, background: 'var(--hg-red)' }}
            />
          </div>
          {LOADING_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 text-sm transition-all duration-300"
              style={{ color: i === loadingStep ? 'white' : i < loadingStep ? '#4b5563' : '#2a2a2a' }}
            >
              <span style={{ fontSize: '0.6rem', color: i <= loadingStep ? 'var(--hg-red)' : '#2a2a2a' }}>
                {i < loadingStep ? '●' : i === loadingStep ? '○' : '○'}
              </span>
              {step}
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs" style={{ color: '#4b5563' }}>
          Analizando bajo Código General del Proceso — Ley 1564 de 2012
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--hg-black)' }}>

      {/* HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(10,10,10,0.96)', borderBottom: '1px solid #1a1a1a' }}
      >
        <a href="/inicio" className="flex items-center gap-5">
          <HGLogo height={32} />
          <div className="hidden sm:block h-6 w-px" style={{ background: '#2a2a2a' }} />
          <div className="hidden sm:block">
            <div className="font-black text-white tracking-widest uppercase text-sm">LITIGIA</div>
            <div className="text-xs uppercase tracking-widest" style={{ color: '#4b5563', fontSize: '0.6rem' }}>
              Automatización de contestaciones
            </div>
          </div>
        </a>

        <nav className="flex items-center gap-6">
          <a
            href="/terminos"
            className="text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            Términos
          </a>
          <a
            href="/dashboard"
            className="text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            Impacto económico
          </a>

          {user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2.5 px-3 py-1.5 transition-colors"
                style={{ border: '1px solid #2a2a2a', background: userMenuOpen ? '#1a1a1a' : 'transparent' }}
              >
                {/* Avatar: foto o iniciales */}
                <div
                  className="w-6 h-6 overflow-hidden flex items-center justify-center font-black text-white flex-shrink-0"
                  style={{
                    background: user.foto_url ? 'transparent' : 'var(--hg-red)',
                    fontSize: '0.55rem',
                    letterSpacing: '0.05em',
                    borderRadius: user.foto_url ? '50%' : 0,
                  }}
                >
                  {user.foto_url
                    ? <img src={user.foto_url} alt="" className="w-full h-full object-cover" />
                    : user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')
                  }
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white" style={{ fontSize: '0.65rem' }}>
                    {user.nombre.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{ color: '#4b5563', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {user.cargo}
                  </div>
                </div>
                <span style={{ color: '#4b5563', fontSize: '0.6rem' }}>▾</span>
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 min-w-48 py-1 z-50"
                  style={{ background: '#0d0d0d', border: '1px solid #2a2a2a' }}
                >
                  <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: '#1a1a1a' }}>
                    <div
                      className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-black text-white flex-shrink-0"
                      style={{ background: user.foto_url ? 'transparent' : 'var(--hg-red)', fontSize: '0.65rem' }}
                    >
                      {user.foto_url
                        ? <img src={user.foto_url} alt="" className="w-full h-full object-cover" />
                        : user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')
                      }
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{user.nombre}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{user.cargo}</div>
                    </div>
                  </div>
                  <a href="/perfil" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs uppercase tracking-widest font-semibold text-left transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                  >
                    ✏ Mi perfil y firma
                  </a>
                  <a href="/dashboard" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs uppercase tracking-widest font-semibold text-left transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                  >
                    ◎ Impacto económico
                  </a>
                  <div className="border-t my-1" style={{ borderColor: '#1a1a1a' }} />
                  <button onClick={logout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs uppercase tracking-widest font-semibold text-left transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a0808'; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                  >
                    → Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* ALERTA DE VENCIMIENTOS PRÓXIMOS */}
      {alertasVencimiento.length > 0 && (
        <div className="pt-20 px-8">
          <div
            className="max-w-4xl mx-auto px-5 py-4 flex items-start gap-3"
            style={{ background: '#1a0808', border: '1px solid #7f1d1d', borderLeft: '4px solid var(--hg-red)' }}
          >
            <div className="w-6 h-6 flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5" style={{ background: 'var(--hg-red)', color: 'white' }}>!</div>
            <div className="flex-1">
              <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>
                {alertasVencimiento.length} caso{alertasVencimiento.length > 1 ? 's' : ''} con término por vencer
              </p>
              <ul className="space-y-1">
                {alertasVencimiento.map(a => (
                  <li key={a.id} className="text-xs" style={{ color: '#fca5a5' }}>
                    {a.demandado || 'Demandado'} vs. {a.demandante || 'Demandante'} — vence el{' '}
                    {formatFechaLegible(a.fecha_vencimiento, 'largo') || 'fecha no disponible'}
                  </li>
                ))}
              </ul>
              <a href="/terminos" className="inline-block mt-2 text-xs font-black uppercase tracking-widest" style={{ color: 'white', textDecoration: 'underline' }}>
                Ver todos los términos →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative pt-40 pb-52 px-8 text-center wave-dark-to-light">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: 0.3,
          }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-block text-xs font-black tracking-widest uppercase mb-8 px-4 py-1.5" style={{ background: 'var(--hg-red)', color: 'white' }}>
            Legal Hack Icesi 2026 — Reto 1: Litigio Masivo
          </div>
          <h1 className="font-black text-white leading-none mb-6" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', letterSpacing: '-0.02em' }}>
            Contestaciones en<br />
            <span style={{ color: 'var(--hg-red)' }}>minutos,</span> no en horas.
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-2" style={{ color: '#6b7280', fontWeight: 400 }}>
            Sube la demanda en PDF. La IA extrae las partes, clasifica el proceso,
            selecciona la estrategia y redacta el borrador conforme al{' '}
            <span className="text-white font-semibold">Código General del Proceso.</span>
          </p>
          <p className="text-xs mb-14 uppercase tracking-widest" style={{ color: '#3a3a3a' }}>
            El abogado siempre revisa y firma — la responsabilidad jurídica nunca se delega a la IA
          </p>

          {/* UPLOAD */}
          <div
            className="max-w-lg mx-auto border-2 border-dashed transition-all cursor-pointer p-10"
            style={{
              background: '#0d0d0d',
              borderColor: dragging ? 'var(--hg-red)' : '#2a2a2a',
              boxShadow: dragging ? '0 0 0 4px rgba(139,28,28,0.15)' : 'none',
            }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            {!file ? (
              <div className="text-center">
                <div className="mx-auto mb-5 w-12 h-12 flex items-center justify-center" style={{ border: '1px solid #2a2a2a' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3v10M6 7l4-4 4 4M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-white font-bold uppercase tracking-widest text-sm mb-1">Arrastra la demanda aquí</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>o haz clic para seleccionar el PDF</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-5 w-12 h-12 flex items-center justify-center" style={{ border: '1px solid var(--hg-red)', background: 'rgba(139,28,28,0.1)' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l5 5 7-7" stroke="var(--hg-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-white font-bold text-sm mb-1 truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>
                  {(file.size / 1024).toFixed(0)} KB — listo para procesar
                </p>
                <button className="text-xs uppercase tracking-widest underline" style={{ color: '#4b5563' }}
                  onClick={e => { e.stopPropagation(); setFile(null) }}>
                  Cambiar archivo
                </button>
              </div>
            )}
          </div>

          {/* BOTONES */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => generarContestacion(false)}
              disabled={!file}
              className="px-8 py-4 font-black text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: file ? 'var(--hg-red)' : '#1a1a1a', minWidth: 240 }}
              onMouseEnter={e => file && (e.currentTarget.style.background = 'var(--hg-red-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = file ? 'var(--hg-red)' : '#1a1a1a')}
            >
              Generar Contestación
            </button>
            <button
              onClick={() => generarContestacion(true)}
              className="px-8 py-4 font-semibold text-xs uppercase tracking-widest transition-colors border"
              style={{ borderColor: '#2a2a2a', color: '#6b7280', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--hg-red)'; e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#6b7280' }}
            >
              Demo — caso de ejemplo
            </button>
          </div>

          {error && (
            <div className="mt-5 px-5 py-4 text-sm max-w-lg mx-auto text-left" style={{ background: '#1a0808', color: '#fca5a5', border: '1px solid #7f1d1d' }}>
              {error}
            </div>
          )}

          {/* STATS */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-sm mx-auto">
            {[
              { val: '30 min', sub: 'vs. 3h manuales' },
              { val: 'CGP', sub: '5 secciones formales' },
              { val: '100%', sub: 'revisable por el abogado' },
            ].map(s => (
              <div key={s.sub} className="text-center">
                <div className="font-black text-2xl" style={{ color: 'var(--hg-red)' }}>{s.val}</div>
                <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: '#4b5563', fontSize: '0.6rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-28 px-8" style={{ background: 'var(--hg-gray-light)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--hg-red)' }}>Metodología</div>
            <h2 className="font-black text-4xl" style={{ color: 'var(--hg-black)', letterSpacing: '-0.02em' }}>
              Tres pasos. El abogado no sale<br />de la ecuación.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASOS.map((paso, i) => (
              <div key={i} className="relative p-8 overflow-hidden" style={{ background: 'white', borderTop: '3px solid var(--hg-red)' }}>
                <div className="absolute top-6 right-7 font-black" style={{ fontSize: '4rem', color: 'var(--hg-red)', opacity: 0.06, lineHeight: 1 }}>{i + 1}</div>
                <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--hg-red)' }}>Paso {i + 1}</div>
                <h3 className="font-black text-lg mb-3 uppercase tracking-tight" style={{ color: 'var(--hg-black)', letterSpacing: '-0.01em' }}>{paso.titulo}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NORMATIVA */}
      <section className="wave-light-to-dark py-28 px-8" style={{ background: 'var(--hg-gray-light)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--hg-red)' }}>Marco jurídico</div>
          <h2 className="font-black text-3xl mb-8" style={{ color: 'var(--hg-black)', letterSpacing: '-0.02em' }}>Normativa colombiana vigente</h2>
          <div className="flex justify-center mb-12">
            <img src="/escudo-colombia.webp" alt="Escudo de Colombia" style={{ height: 120, width: 'auto', opacity: 0.88, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.18))' }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {NORMAS.map(n => (
              <a
                key={n.label}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-center transition-colors"
                style={{ background: 'white', color: '#1a1a1a', border: '1px solid #e5e5e5', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--hg-red)'; e.currentTarget.style.borderColor = 'var(--hg-red)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = '#e5e5e5' }}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-8 text-center border-t" style={{ background: 'var(--hg-black)', borderColor: '#1a1a1a' }}>
        <div className="flex justify-center mb-4"><HGLogo height={30} /></div>
        <p className="text-xs uppercase tracking-widest" style={{ color: '#4b5563' }}>LitigIA — Legal Hack Icesi 2026 · Hurtado Gandini Abogados S.A.S.</p>
        <p className="text-xs mt-2" style={{ color: '#2a2a2a' }}>Esta herramienta genera borradores de apoyo. El abogado es siempre el responsable jurídico del documento final.</p>
      </footer>
    </div>
  )
}

function HGLogo({ height = 36 }: { height?: number }) {
  return <img src="/logo-hg.webp" alt="Hurtado Gandini" height={height} style={{ height, width: 'auto', display: 'block' }} />
}

const PASOS = [
  { titulo: 'Sube la demanda en PDF', desc: 'El sistema extrae automáticamente las partes del proceso, pretensiones, cuantía, juzgado competente, tipo de proceso y término de contestación conforme al CGP.' },
  { titulo: 'La IA analiza y redacta', desc: 'Selecciona la estrategia defensiva óptima — excepciones previas, de mérito, llamamiento en garantía — y redacta el borrador con estructura formal del Código General del Proceso.' },
  { titulo: 'El abogado revisa y firma', desc: 'Las secciones críticas aparecen resaltadas con anotaciones de revisión. El abogado edita, valida y suscribe el documento. La responsabilidad jurídica siempre es suya.' },
]

const NORMAS = [
  { label: 'CGP — Ley 1564/2012', url: 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1564_2012.html' },
  { label: 'Art. 96 — Contestación', url: 'https://leyes.co/codigo_general_del_proceso/96.htm' },
  { label: 'Art. 100 — Exc. previas', url: 'https://leyes.co/codigo_general_del_proceso/100.htm' },
  { label: 'Art. 282 — Exc. de mérito', url: 'https://leyes.co/codigo_general_del_proceso/282.htm' },
  { label: 'Art. 369 — Proc. verbal', url: 'https://leyes.co/codigo_general_del_proceso/369.htm' },
  { label: 'C. Comercio — Seguros', url: 'http://www.secretariasenado.gov.co/senado/basedoc/codigo_comercio_pr031.html#1036' },
  { label: 'Ley 1480/2011', url: 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1480_2011.html' },
  { label: 'CPACA Ley 1437/2011', url: 'http://www.secretariasenado.gov.co/senado/basedoc/ley_1437_2011.html' },
]
