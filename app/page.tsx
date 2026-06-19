'use client'

import { useRouter } from 'next/navigation'

const FEATURES = [
  {
    num: '01',
    titulo: 'Análisis automático',
    desc: 'El sistema lee la demanda en PDF, extrae partes, pretensiones, cuantía y tipo de proceso conforme al Código General del Proceso.',
  },
  {
    num: '02',
    titulo: 'Borrador jurídico completo',
    desc: 'Genera la contestación con las cinco secciones formales: encabezado, pronunciamiento sobre hechos, excepciones, pruebas y peticiones.',
  },
  {
    num: '03',
    titulo: 'Revisión guiada',
    desc: 'Las secciones críticas quedan marcadas para revisión. El abogado edita, valida cada punto y firma el documento final.',
  },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ background: 'var(--hg-black)', color: 'white' }}>
      {/* Grid de fondo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: 0.22,
        }}
      />

      {/* ── HEADER ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid #1a1a1a' }}
      >
        <img src="/logo-hg.webp" alt="Hurtado Gandini" style={{ height: 30, width: 'auto' }} />

        <div className="flex items-center gap-6">
          <a
            href="/dashboard"
            className="text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{ color: '#4b5563' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
          >
            Impacto económico
          </a>
          <button
            onClick={() => router.push('/login')}
            className="text-xs font-black uppercase tracking-widest px-6 py-2.5 text-white transition-opacity"
            style={{ background: 'var(--hg-red)', letterSpacing: '0.1em' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Ingresar →
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-44 pb-48 px-8 text-center">
        {/* Chip superior */}
        <div
          className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase mb-8 px-4 py-1.5"
          style={{ background: 'rgba(139,28,28,0.15)', color: 'var(--hg-red)', border: '1px solid rgba(139,28,28,0.3)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--hg-red)' }}
          />
          Plataforma privada — acceso exclusivo a la firma
        </div>

        <h1
          className="font-black leading-none text-white mb-6"
          style={{ fontSize: 'clamp(3rem, 9vw, 6.5rem)', letterSpacing: '-0.03em' }}
        >
          LitigIA
        </h1>

        <p
          className="font-black uppercase tracking-widest mb-4"
          style={{ fontSize: 'clamp(0.9rem, 2vw, 1.2rem)', color: 'var(--hg-red)', letterSpacing: '0.15em' }}
        >
          Automatización de contestaciones de demanda
        </p>

        <p className="max-w-xl mx-auto text-base leading-relaxed mb-4" style={{ color: '#6b7280' }}>
          Sistema de inteligencia artificial diseñado exclusivamente para los abogados de{' '}
          <span className="text-white font-semibold">Hurtado Gandini Abogados S.A.S.</span>{' '}
          Genera borradores completos de contestación en minutos, con revisión obligatoria por el profesional del derecho.
        </p>
        <p
          className="text-xs uppercase tracking-widest mb-14"
          style={{ color: '#3a3a3a' }}
        >
          El abogado siempre revisa, edita y firma — la responsabilidad jurídica nunca se delega a la IA
        </p>

        <button
          onClick={() => router.push('/login')}
          className="inline-block text-xs font-black uppercase tracking-widest px-10 py-5 text-white transition-opacity"
          style={{ background: 'var(--hg-red)', letterSpacing: '0.12em', fontSize: '0.7rem' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hg-red-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--hg-red)')}
        >
          Acceder al sistema
        </button>

        {/* Separador */}
        <div className="mt-24 flex items-center justify-center gap-6">
          {[
            { val: '< 30 min', label: 'por contestación' },
            { val: 'CGP 2012', label: 'normativa aplicada' },
            { val: '100%', label: 'revisado por abogado' },
          ].map(s => (
            <div key={s.label} className="text-center px-8 border-r last:border-r-0" style={{ borderColor: '#1a1a1a' }}>
              <div className="font-black text-2xl mb-1" style={{ color: 'var(--hg-red)' }}>{s.val}</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: '#4b5563', fontSize: '0.6rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Línea divisora */}
      <div style={{ height: 1, background: '#1a1a1a' }} />

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-28 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--hg-red)' }}>
              Metodología
            </div>
            <h2 className="font-black text-4xl text-white" style={{ letterSpacing: '-0.02em' }}>
              Tres pasos.<br />El abogado nunca sale de la ecuación.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-0 border" style={{ borderColor: '#1a1a1a' }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.num}
                className="p-8 relative"
                style={{
                  borderRight: i < 2 ? '1px solid #1a1a1a' : 'none',
                  background: '#0a0a0a',
                }}
              >
                <div
                  className="font-black mb-6"
                  style={{ color: '#1a1a1a', fontSize: '4.5rem', lineHeight: 1, letterSpacing: '-0.04em' }}
                >
                  {f.num}
                </div>
                <div
                  className="font-black text-sm uppercase tracking-widest mb-3"
                  style={{ color: 'var(--hg-red)', letterSpacing: '0.1em' }}
                >
                  {f.titulo}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AVISO DE ACCESO RESTRINGIDO ── */}
      <section className="py-20 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="p-10"
            style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderTop: '3px solid var(--hg-red)' }}
          >
            {/* Ícono candado */}
            <div
              className="w-12 h-12 mx-auto mb-6 flex items-center justify-center"
              style={{ border: '1px solid #2a2a2a' }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="10" width="16" height="11" rx="1" stroke="#8B1C1C" strokeWidth="1.5"/>
                <path d="M7 10V7a4 4 0 018 0v3" stroke="#8B1C1C" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="11" cy="15.5" r="1.5" fill="#8B1C1C"/>
              </svg>
            </div>
            <div
              className="font-black text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--hg-red)', letterSpacing: '0.15em' }}
            >
              Acceso restringido
            </div>
            <h3 className="font-black text-xl text-white mb-4 uppercase tracking-tight">
              Plataforma de uso interno
            </h3>
            <p className="text-sm leading-relaxed mb-8" style={{ color: '#6b7280' }}>
              Esta herramienta es de uso exclusivo para los abogados y profesionales de{' '}
              <span className="text-white font-semibold">Hurtado Gandini Abogados S.A.S.</span>{' '}
              No se aceptan registros externos. Las credenciales son asignadas por la administración de la firma.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="text-xs font-black uppercase tracking-widest px-8 py-4 text-white transition-opacity"
              style={{ background: 'var(--hg-red)', letterSpacing: '0.12em' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Ingresar con credenciales
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 px-8 border-t text-center"
        style={{ borderColor: '#1a1a1a' }}
      >
        <img src="/logo-hg.webp" alt="Hurtado Gandini" style={{ height: 26, width: 'auto', margin: '0 auto 12px' }} />
        <p className="text-xs uppercase tracking-widest" style={{ color: '#2a2a2a' }}>
          LitigIA · Hurtado Gandini Abogados S.A.S. · Todos los derechos reservados
        </p>
        <p className="text-xs mt-2" style={{ color: '#1a1a1a' }}>
          Esta herramienta genera borradores de apoyo. El abogado es siempre el responsable jurídico del documento final.
        </p>
      </footer>
    </div>
  )
}
