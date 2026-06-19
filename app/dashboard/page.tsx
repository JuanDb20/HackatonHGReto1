'use client'

import { useEffect, useState } from 'react'

// ====================================================================
// PARÁMETROS FINANCIEROS
// Fuente: Cálculos del equipo de finanzas — Legal Hack Icesi 2026
// ====================================================================
const PARAMS = {
  horasSinSistema: 3,          // horas promedio por contestación sin IA
  horasConSistema: 0.5,        // 30 minutos de revisión con IA
  tarifaHoraAbogadoJunior: 120000, // COP/hora — tarifa hora abogado junior HG
  demandas_base: 127,          // documentos procesados acumulados (demo)
  demandasMes: 50,             // promedio mensual HG (conservador: reto dice 30-80)
}

function calcularImpacto(totalDocs: number) {
  const horasAhorradasPorDoc = PARAMS.horasSinSistema - PARAMS.horasConSistema
  const totalHorasAhorradas = totalDocs * horasAhorradasPorDoc
  const totalPesosAhorrados = totalHorasAhorradas * PARAMS.tarifaHoraAbogadoJunior
  const ahorroPorcentual = ((horasAhorradasPorDoc / PARAMS.horasSinSistema) * 100).toFixed(0)
  const capacidadLiberada = Math.floor(totalHorasAhorradas / PARAMS.horasSinSistema)
  return { totalHorasAhorradas, totalPesosAhorrados, ahorroPorcentual, capacidadLiberada }
}

function formatCOP(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('es-CO')}`
}

export default function DashboardPage() {
  const [totalDocs, setTotalDocs] = useState(PARAMS.demandas_base)
  const [animatedValues, setAnimatedValues] = useState({ docs: 0, horas: 0, pesos: 0, cap: 0 })

  useEffect(() => {
    const stored = localStorage.getItem('litigia_count')
    if (stored) {
      setTotalDocs(parseInt(stored))
    }
  }, [])

  const impacto = calcularImpacto(totalDocs)

  // Animación de números al cargar
  useEffect(() => {
    const duration = 1500
    const steps = 60
    const interval = duration / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const ease = 1 - Math.pow(1 - progress, 3) // ease out cubic

      setAnimatedValues({
        docs: Math.floor(totalDocs * ease),
        horas: Math.floor(impacto.totalHorasAhorradas * ease),
        pesos: Math.floor(impacto.totalPesosAhorrados * ease),
        cap: Math.floor(impacto.capacidadLiberada * ease),
      })

      if (step >= steps) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [totalDocs, impacto.totalHorasAhorradas, impacto.totalPesosAhorrados, impacto.capacidadLiberada])

  return (
    <div className="min-h-screen" style={{ background: 'var(--hg-black)' }}>

      {/* HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(10,10,10,0.95)', borderBottom: '1px solid var(--hg-border)' }}
      >
        <a href="/inicio" className="flex items-center gap-3">
          <HGLogo />
          <div className="ml-1 hidden sm:block">
            <div className="text-white font-black text-sm tracking-widest uppercase">LitigIA</div>
            <div style={{ color: 'var(--hg-text-muted)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              powered by Hurtado Gandini
            </div>
          </div>
        </a>
        <nav className="flex items-center gap-6">
          <a href="/inicio" className="text-sm hover:text-white transition-colors" style={{ color: 'var(--hg-text-muted)' }}>
            Generar contestación
          </a>
          <a href="/terminos" className="text-sm hover:text-white transition-colors" style={{ color: 'var(--hg-text-muted)' }}>
            Términos
          </a>
        </nav>
      </header>

      <div className="pt-24 pb-20 px-8">
        <div className="max-w-5xl mx-auto">

          {/* TÍTULO */}
          <div className="text-center mb-14">
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded"
              style={{ background: 'var(--hg-red)', color: 'white' }}
            >
              Impacto económico
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
              El tiempo es dinero.
              <br />
              <span style={{ color: 'var(--hg-red)' }}>Aquí están las cifras.</span>
            </h1>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#9ca3af' }}>
              Cada contestación procesada por LitigIA libera capacidad real en la firma.
              Calculado sobre tarifas reales del mercado legal colombiano.
            </p>
          </div>

          {/* MÉTRICAS PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <MetricCard
              icon="📄"
              value={animatedValues.docs.toLocaleString('es-CO')}
              label="Contestaciones generadas"
              sub="desde el inicio del sistema"
              accent
            />
            <MetricCard
              icon="⏱"
              value={animatedValues.horas.toLocaleString('es-CO')}
              label="Horas ahorradas"
              sub={`${PARAMS.horasSinSistema}h → 30 min por caso`}
              accent
            />
            <MetricCard
              icon="💰"
              value={formatCOP(animatedValues.pesos)}
              label="Pesos COP liberados"
              sub={`a $${(PARAMS.tarifaHoraAbogadoJunior / 1000).toFixed(0)}K/h abogado junior`}
              accent
            />
            <MetricCard
              icon="⚖️"
              value={animatedValues.cap.toLocaleString('es-CO')}
              label="Casos extra que puede atender la firma"
              sub="con el mismo equipo"
              accent
            />
          </div>

          {/* BARRA DE EFICIENCIA */}
          <div
            className="rounded-2xl p-8 mb-8"
            style={{ background: 'var(--hg-dark-card)', border: '1px solid var(--hg-border)' }}
          >
            <h2 className="text-white font-black text-xl mb-6">Reducción de tiempo por contestación</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#9ca3af' }}>Proceso manual actual</span>
                  <span className="text-white font-bold">{PARAMS.horasSinSistema} horas</span>
                </div>
                <div className="h-4 rounded-full overflow-hidden" style={{ background: '#222' }}>
                  <div className="h-full rounded-full" style={{ width: '100%', background: '#6b7280' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#9ca3af' }}>Con LitigIA (solo revisión)</span>
                  <span className="font-bold" style={{ color: '#86efac' }}>30 minutos</span>
                </div>
                <div className="h-4 rounded-full overflow-hidden" style={{ background: '#222' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${((PARAMS.horasConSistema / PARAMS.horasSinSistema) * 100).toFixed(0)}%`, background: 'var(--hg-red)' }}
                  />
                </div>
              </div>
            </div>
            <div
              className="mt-6 inline-block px-5 py-3 rounded-xl"
              style={{ background: 'rgba(139,28,28,0.15)', border: '1px solid rgba(139,28,28,0.4)' }}
            >
              <span className="text-3xl font-black" style={{ color: 'var(--hg-red)' }}>{impacto.ahorroPorcentual}% </span>
              <span className="text-white font-bold">menos tiempo por caso</span>
            </div>
          </div>

          {/* PROYECCIÓN MENSUAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl p-7" style={{ background: 'var(--hg-dark-card)', border: '1px solid var(--hg-border)' }}>
              <h3 className="text-white font-black text-lg mb-5">Proyección mensual</h3>
              <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
                Basado en {PARAMS.demandasMes} demandas/mes (escenario conservador — HG recibe 30-80)
              </p>
              {[
                {
                  label: 'Horas ahorradas/mes',
                  val: `${(PARAMS.demandasMes * (PARAMS.horasSinSistema - PARAMS.horasConSistema)).toFixed(0)}h`,
                  color: '#86efac',
                },
                {
                  label: 'Ahorro mensual COP',
                  val: formatCOP(PARAMS.demandasMes * (PARAMS.horasSinSistema - PARAMS.horasConSistema) * PARAMS.tarifaHoraAbogadoJunior),
                  color: 'var(--hg-red)',
                },
                {
                  label: 'Ahorro anual COP',
                  val: formatCOP(12 * PARAMS.demandasMes * (PARAMS.horasSinSistema - PARAMS.horasConSistema) * PARAMS.tarifaHoraAbogadoJunior),
                  color: '#fbbf24',
                },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--hg-border)' }}>
                  <span className="text-sm" style={{ color: '#9ca3af' }}>{row.label}</span>
                  <span className="text-xl font-black" style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-7" style={{ background: 'var(--hg-dark-card)', border: '1px solid var(--hg-border)' }}>
              <h3 className="text-white font-black text-lg mb-5">Modelo de negocio</h3>

              {[
                { fase: 'MVP', desc: 'Demo funcional — Legal Hack Icesi', color: 'var(--hg-red)', activo: true },
                { fase: 'v1.0', desc: 'Integración con sistema de casos HG, historial, plantillas propias', color: '#6b7280', activo: false },
                { fase: 'v2.0', desc: 'Integración Rama Judicial, alertas de términos, reportes automáticos', color: '#6b7280', activo: false },
                { fase: 'SaaS', desc: 'Licenciamiento a otras firmas. Soporte, actualizaciones, capacitación.', color: '#6b7280', activo: false },
              ].map(item => (
                <div key={item.fase} className="flex gap-4 mb-4">
                  <div
                    className="text-xs font-black px-2 py-1 rounded h-fit"
                    style={{
                      background: item.activo ? 'var(--hg-red)' : '#1a1a1a',
                      color: item.activo ? 'white' : '#4b5563',
                      border: `1px solid ${item.activo ? 'var(--hg-red)' : '#2a2a2a'}`,
                    }}
                  >
                    {item.fase}
                  </div>
                  <p className="text-sm" style={{ color: item.activo ? '#d1d5db' : '#4b5563' }}>{item.desc}</p>
                </div>
              ))}

              <div
                className="mt-4 p-3 rounded-lg text-xs"
                style={{ background: 'rgba(139,28,28,0.1)', border: '1px solid rgba(139,28,28,0.3)', color: '#fca5a5' }}
              >
                💡 El valor real está en las actualizaciones y el soporte — no en la licencia inicial.
              </div>
            </div>
          </div>

          {/* MODELO DE NEGOCIO SAAS */}
          <div className="rounded-2xl p-7 mb-8" style={{ background: 'var(--hg-dark-card)', border: '1px solid var(--hg-border)' }}>
            <h2 className="text-white font-black text-xl mb-2">Modelo de negocio: licenciamiento SaaS a otras firmas</h2>
            <p className="text-xs mb-6 max-w-2xl" style={{ color: '#6b7280' }}>
              Más allá del uso interno en Hurtado Gandini, LitigIA puede licenciarse como suscripción B2B a otras firmas legales colombianas. Estas cifras están calculadas sobre el costo real de la API de Claude y benchmarks del sector.
            </p>

            {/* Comparativa de precios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
              <div className="rounded-xl p-5" style={{ background: 'rgba(139,28,28,0.12)', border: '1px solid var(--hg-red)' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hg-red)' }}>Plan LitigIA B2B</div>
                <div className="text-3xl font-black text-white">$250<span className="text-sm font-semibold" style={{ color: '#9ca3af' }}>/mes</span></div>
                <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>o $2.500 USD/año por firma cliente (paga 10, recibe 12)</div>
              </div>
              <div className="rounded-xl p-5" style={{ background: '#0f0f0f', border: '1px solid var(--hg-border)' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Competencia — Legora</div>
                <div className="text-3xl font-black" style={{ color: '#d1d5db' }}>$2.500<span className="text-sm font-semibold" style={{ color: '#6b7280' }}>/mes</span></div>
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>$30.000 USD/año — 10x más costoso que LitigIA</div>
              </div>
              <div className="rounded-xl p-5" style={{ background: '#0f0f0f', border: '1px solid var(--hg-border)' }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Alternativa — contratar abogado junior</div>
                <div className="text-3xl font-black" style={{ color: '#d1d5db' }}>~$1.176<span className="text-sm font-semibold" style={{ color: '#6b7280' }}>/mes</span></div>
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>≈ $4,07M COP/mes en nómina — 4,7x el costo de la licencia</div>
              </div>
            </div>

            {/* Proyección financiera */}
            <h3 className="text-white font-bold text-sm mb-3">Proyección financiera — escenario esperado (52 firmas cliente)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
              {[
                { label: 'Ingreso operativo', val: '$130.000', color: '#d1d5db' },
                { label: 'Costo operativo (API Claude)', val: '$1.587', color: '#d1d5db' },
                { label: 'Utilidad operativa (EBIT)', val: '$128.413', color: '#86efac' },
                { label: 'Utilidad neta', val: '$43.443', color: 'var(--hg-red)' },
              ].map(row => (
                <div key={row.label} className="rounded-lg p-4" style={{ background: '#0f0f0f', border: '1px solid var(--hg-border)' }}>
                  <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{row.label}</div>
                  <div className="text-lg font-black" style={{ color: row.color }}>{row.val}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
              <div className="rounded-xl p-5" style={{ background: 'rgba(139,28,28,0.1)', border: '1px solid rgba(139,28,28,0.3)' }}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#fca5a5' }}>Margen neto proyectado</div>
                <div className="text-3xl font-black text-white">33,42%</div>
                <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>Sobre $130.000 USD de ingreso operativo anual con 52 clientes.</div>
              </div>
              <div className="rounded-xl p-5" style={{ background: '#0f0f0f', border: '1px solid var(--hg-border)' }}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>Punto de equilibrio</div>
                <div className="text-3xl font-black text-white">25 firmas</div>
                <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>Clientes necesarios para cubrir costos fijos y de API (break-even: 24,9).</div>
              </div>
            </div>

            {/* Benchmark de márgenes del sector legal */}
            <h3 className="text-white font-bold text-sm mb-3">¿Por qué importa el margen? Benchmark del sector legal colombiano</h3>
            <div className="space-y-3">
              {[
                { label: 'Hurtado Gandini S.A.S. (margen neto real)', pct: 0.07, color: '#6b7280' },
                { label: 'Brigard & Urrutia Abogados S.A.S.', pct: 1.46, color: '#6b7280' },
                { label: 'Olarte Moure & Asociados S.A.S.', pct: 17.94, color: '#9ca3af' },
                { label: 'LitigIA — SaaS B2B (proyectado)', pct: 33.42, color: 'var(--hg-red)' },
              ].map(b => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#9ca3af' }}>{b.label}</span>
                    <span className="font-bold" style={{ color: b.color }}>{b.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 35) / 35 * 100}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: '#4b5563' }}>
              Fuente: EMIS Markets (estados financieros individuales 2025, sector Servicios de apoyo a las empresas 17.2). Costo de API calculado sobre Claude Sonnet 4.6 (Anthropic, tarifas vigentes) y tasa de cambio de referencia 1 USD ≈ $3.459,53 COP.
            </p>
          </div>

          {/* SUPUESTOS */}
          <div className="rounded-2xl p-7" style={{ background: '#0f0f0f', border: '1px solid var(--hg-border)' }}>
            <h3 className="text-white font-bold text-base mb-4">📊 Supuestos del modelo financiero</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tiempo sin IA', val: `${PARAMS.horasSinSistema}h/caso`, note: 'Fuente: Reto 1 HG (2-4h, media 3h)' },
                { label: 'Tiempo con IA', val: '30 min/caso', note: 'Solo revisión del borrador' },
                { label: 'Tarifa referencia', val: `$${(PARAMS.tarifaHoraAbogadoJunior / 1000).toFixed(0)}K/h`, note: 'Abogado junior Cali 2026' },
                { label: 'Volumen base', val: `${PARAMS.demandasMes}/mes`, note: 'Escenario conservador HG' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>{s.label}</div>
                  <div className="text-lg font-black" style={{ color: 'var(--hg-red)' }}>{s.val}</div>
                  <div className="text-xs mt-1" style={{ color: '#4b5563' }}>{s.note}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="py-8 px-8 text-center border-t" style={{ background: 'var(--hg-black)', borderColor: 'var(--hg-border)' }}>
        <div className="flex justify-center mb-2"><HGLogo /></div>
        <p className="text-xs" style={{ color: 'var(--hg-text-muted)' }}>
          LitigIA — Legal Hack Icesi 2026 · Hurtado Gandini Abogados S.A.S.
        </p>
      </footer>
    </div>
  )
}

function MetricCard({ icon, value, label, sub, accent }: {
  icon: string
  value: string
  label: string
  sub: string
  accent?: boolean
}) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: accent ? '#0f0f0f' : 'var(--hg-dark-card)',
        border: `1px solid ${accent ? 'rgba(139,28,28,0.4)' : 'var(--hg-border)'}`,
      }}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-black mb-1" style={{ color: accent ? 'var(--hg-red)' : 'white' }}>
        {value}
      </div>
      <div className="text-sm font-semibold text-white mb-1">{label}</div>
      <div className="text-xs" style={{ color: '#6b7280' }}>{sub}</div>
    </div>
  )
}

function HGLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" width="36" height="36" fill="none">
        <rect x="2" y="2" width="11" height="36" fill="white" />
        <rect x="27" y="2" width="11" height="36" fill="white" />
        <rect x="2" y="14" width="36" height="6" fill="#8B1C1C" />
        <rect x="2" y="22" width="36" height="5" fill="#8B1C1C" opacity="0.6" />
      </svg>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', letterSpacing: '0.18em', lineHeight: 1.1 }}>HURTADO</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', letterSpacing: '0.18em', lineHeight: 1.1 }}>GANDINI</div>
      </div>
    </div>
  )
}
