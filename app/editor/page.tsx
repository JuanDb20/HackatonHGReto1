'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ContestacionData, SeccionContestacion } from '@/lib/types'

interface UserProfile {
  nombre: string
  cargo: string
  tarjeta_profesional: string | null
  cedula: string | null
  firma_base64: string | null
  foto_url: string | null
}

// Reemplaza placeholders que Claude genera con los datos reales del abogado.
// Cubre tanto placeholders entre corchetes como números/nombres "inventados"
// por el modelo que no vienen entre corchetes (p. ej. "C.C. No. 17.234.567 de [CIUDAD]").
function fillAbogado(text: string, u: UserProfile): string {
  let out = text

  // Nombre del abogado / apoderado judicial — distintas variantes que genera el modelo
  out = out.replace(/\[NOMBRE DEL (?:APODERADO JUDICIAL|APODERADO|ABOGADO)\]/gi, u.nombre)

  // Bloque de firma completo: línea de nombre + línea de C.C. + línea de T.P.
  // Se reescriben las 3 líneas juntas sin importar si el modelo dejó placeholders
  // entre corchetes o ya inventó un nombre/número de cédula/tarjeta profesional.
  out = out.replace(
    /(^|\n)([^\n]*)\n(\s*C\.C\.\s*No\.?[^\n]*)\n(\s*T\.P\.\s*No\.?[^\n]*del\s*C\.S\.\s*de\s*la\s*J\.[^\n]*)/gi,
    (_m, lead) => `${lead}${u.nombre}\nC.C. No. ${u.cedula || '___'}\nT.P. No. ${u.tarjeta_profesional || '___'} del C.S. de la J.`
  )

  // Fallback por si quedó algún placeholder suelto entre corchetes sin el bloque completo
  out = out.replace(/C\.C\.\s*No\.\s*\[.*?\]/gi, `C.C. No. ${u.cedula || '___'}`)
  out = out.replace(/T\.P\.\s*No\.\s*\[.*?\]\s*del\s*C\.S\.\s*de\s*la\s*J\./gi,
    `T.P. No. ${u.tarjeta_profesional || '___'} del C.S. de la J.`)
  out = out.replace(/\[número\]/gi, u.cedula || '___')

  return out
}

export default function EditorPage() {
  const router = useRouter()
  const [data, setData] = useState<ContestacionData | null>(null)
  const [activeSection, setActiveSection] = useState<string>('')
  const [reviewedSections, setReviewedSections] = useState<Set<string>>(new Set())
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const stored = localStorage.getItem('litigia_contestacion')
    if (!stored) { router.push('/inicio'); return }
    const parsed = JSON.parse(stored)
    setData(parsed)
    if (parsed.sections?.length > 0) setActiveSection(parsed.sections[0].id)
  }, [router])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(profile => {
        if (!profile) return
        setUserProfile(profile)
        // Reemplazar placeholders en los contentEditable ya montados
        setTimeout(() => {
          Object.entries(contentRefs.current).forEach(([, el]) => {
            if (el && el.innerText) {
              const filled = fillAbogado(el.innerText, profile)
              if (filled !== el.innerText) el.innerText = filled
            }
          })
        }, 100)
      })
      .catch(() => {})
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // IntersectionObserver: actualiza sidebar al scrollear
  useEffect(() => {
    if (!data) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id')
            if (id) setActiveSection(id)
          }
        }
      },
      { threshold: 0.2, rootMargin: '-60px 0px -55% 0px' }
    )
    Object.values(sectionRefs.current).forEach(ref => { if (ref) observer.observe(ref) })
    return () => observer.disconnect()
  }, [data])

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id)
    const el = sectionRefs.current[id]
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }, [])

  const toggleReviewed = (id: string) => {
    setReviewedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportarDocumento = () => {
    if (!data) return
    const abogado = userProfile
    const sections = data.sections.map(s => {
      const raw = contentRefs.current[s.id]?.innerText || s.contenido
      return { ...s, contenido: abogado ? fillAbogado(raw, abogado) : raw }
    })

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Contestación de Demanda — ${data.metadata.demandado}</title>
  <style>
    @page { margin: 2.5cm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #000;
      max-width: 800px;
      margin: 0 auto;
    }
    .doc-title {
      text-align: center;
      font-weight: bold;
      font-size: 13pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6pt;
    }
    .doc-subtitle {
      text-align: center;
      font-size: 10pt;
      color: #444;
      margin-bottom: 32pt;
    }
    h2 {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 24pt;
      margin-bottom: 8pt;
      border-bottom: 1px solid #999;
      padding-bottom: 3pt;
    }
    p {
      margin: 0 0 8pt 0;
      text-align: justify;
    }
    .signature-area {
      margin-top: 60pt;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #333;
      width: 220pt;
      margin-left: auto;
      margin-bottom: 4pt;
    }
    .signature-label { font-size: 10pt; }
    .footer-note {
      margin-top: 48pt;
      padding-top: 8pt;
      border-top: 1px solid #ccc;
      font-size: 8pt;
      color: #888;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="doc-title">Contestación de Demanda</div>
  <div class="doc-subtitle">
    Proceso ${data.metadata.tipoProceso?.toUpperCase() || ''} &nbsp;·&nbsp; ${data.metadata.juzgado || ''}
    &nbsp;·&nbsp; ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>

  ${sections.map(s => `
    <h2>${s.titulo}</h2>
    ${s.contenido
      .split('\n')
      .filter(line => line.trim())
      .map(line => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
      .join('\n    ')}
  `).join('\n')}

  <h2>VIII. NOTIFICACIONES Y FIRMA</h2>
  <p>El suscrito apoderado judicial recibirá notificaciones en la Secretaría del Despacho y por los demás medios que el Juzgado disponga.</p>
  <p>Del señor Juez, respetuosamente,</p>

  <div class="signature-area" style="text-align:left; margin-top:32pt;">
    ${abogado?.firma_base64
      ? `<img src="${abogado.firma_base64}" alt="Firma" style="height:70px; width:auto; display:block; margin-bottom:4pt;" />`
      : `<div class="signature-line" style="margin-left:0;"></div>`
    }
    <div class="signature-label">${abogado?.nombre || 'Nombre del abogado'}</div>
    <div class="signature-label">C.C. No. ${abogado?.cedula || '___'}</div>
    <div class="signature-label">T.P. No. ${abogado?.tarjeta_profesional || '___'} del C.S. de la J.</div>
    <div class="signature-label">Apoderado Judicial de ${data.metadata.demandado || ''}</div>
  </div>

  <div class="footer-note">
    Documento generado con LitigIA · Hurtado Gandini Abogados S.A.S. · Revisado y validado por el abogado responsable
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      // Esperar a que cargue antes de imprimir
      win.onload = () => win.print()
      setTimeout(() => win.print(), 500)
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hg-black)' }}>
        <div className="text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--hg-red)', borderTopColor: 'transparent' }} />
          <p className="text-xs uppercase tracking-widest" style={{ color: '#6b7280' }}>Cargando contestación...</p>
        </div>
      </div>
    )
  }

  const seccionesRevision = data.sections.filter(s => s.requiereRevision)
  const pendientes = seccionesRevision.filter(s => !reviewedSections.has(s.id))
  const todasRevisadas = pendientes.length === 0
  const algunaRevisada = reviewedSections.size > 0

  return (
    <div style={{ background: '#ebebeb', minHeight: '100vh' }}>

      {/* TOP BAR */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
        style={{ background: 'var(--hg-black)', borderBottom: '1px solid #1a1a1a', height: 56 }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/inicio')}
            className="text-xs uppercase tracking-widest font-semibold transition-colors hover:text-white"
            style={{ color: '#4b5563' }}
          >
            ← Volver
          </button>
          <div className="w-px h-4" style={{ background: '#2a2a2a' }} />
          <span className="text-white font-black text-xs uppercase tracking-widest">Borrador de Contestación</span>

          {/* Badge de estado */}
          {todasRevisadas ? (
            <span
              className="text-xs px-3 py-1 font-black uppercase tracking-widest"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              ✓ Revisado — listo para exportar
            </span>
          ) : algunaRevisada ? (
            <span
              className="text-xs px-3 py-1 font-semibold uppercase tracking-widest"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              {pendientes.length} sección{pendientes.length > 1 ? 'es' : ''} pendiente{pendientes.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span
              className="text-xs px-3 py-1 font-semibold uppercase tracking-widest"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              Pendiente revisión
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!todasRevisadas) {
                // No deja exportar: lleva al abogado a la primera sección pendiente.
                if (pendientes[0]) scrollToSection(pendientes[0].id)
                return
              }
              exportarDocumento()
            }}
            disabled={!todasRevisadas}
            title={todasRevisadas ? 'Exportar documento limpio' : `Marca como revisadas las ${pendientes.length} sección${pendientes.length > 1 ? 'es' : ''} pendiente${pendientes.length > 1 ? 's' : ''} antes de exportar`}
            className="text-xs uppercase tracking-widest font-black px-5 py-2 text-white transition-all"
            style={{
              background: todasRevisadas ? '#16a34a' : '#3f3f3f',
              opacity: todasRevisadas ? 1 : 0.6,
              cursor: todasRevisadas ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => { if (todasRevisadas) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { if (todasRevisadas) e.currentTarget.style.opacity = '1' }}
          >
            {todasRevisadas ? '↓ Exportar documento limpio' : `🔒 Revisa ${pendientes.length} sección${pendientes.length > 1 ? 'es' : ''} para exportar`}
          </button>

          {/* Avatar usuario */}
          {userProfile && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="w-8 h-8 flex items-center justify-center font-black text-white transition-opacity"
                style={{ background: 'var(--hg-red)', fontSize: '0.6rem', letterSpacing: '0.05em' }}
                title={userProfile.nombre}
              >
                {userProfile.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 min-w-44 py-1 z-50"
                  style={{ background: '#0d0d0d', border: '1px solid #2a2a2a' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>
                    <div className="text-xs font-semibold text-white">{userProfile.nombre}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>{userProfile.cargo}</div>
                  </div>
                  <a
                    href="/perfil"
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-xs uppercase tracking-widest font-semibold transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                  >
                    ✏ Mi perfil y firma
                  </a>
                  <button
                    onClick={logout}
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
        </div>
      </div>

      <div className="flex" style={{ paddingTop: 56 }}>

        {/* SIDEBAR */}
        <aside
          className="fixed left-0 bottom-0 overflow-y-auto flex flex-col"
          style={{ top: 56, width: 272, background: 'var(--hg-black)', borderRight: '1px solid #1a1a1a' }}
        >
          {/* Datos del caso */}
          <div className="p-5 border-b" style={{ borderColor: '#1a1a1a' }}>
            <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#4b5563' }}>Datos del caso</div>
            {[
              { label: 'Tipo', val: data.metadata.tipoProceso },
              { label: 'Demandante', val: data.metadata.demandante },
              { label: 'Demandado', val: data.metadata.demandado },
              { label: 'Cuantía', val: data.metadata.cuantia },
              { label: 'Término', val: data.metadata.terminoContestacion },
            ].map(item => (
              <div key={item.label} className="mb-3">
                <div className="mb-0.5" style={{ color: '#4b5563', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div className="text-xs font-semibold text-white leading-snug">{item.val || '—'}</div>
              </div>
            ))}
          </div>

          {/* Estrategia */}
          <div className="p-5 border-b" style={{ borderColor: '#1a1a1a' }}>
            <div className="mb-2" style={{ color: '#4b5563', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estrategia</div>
            <div className="text-xs font-black uppercase tracking-widest px-2 py-1 mb-2 inline-block" style={{ background: 'var(--hg-red)', color: 'white' }}>
              {data.estrategia.tipo}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{data.estrategia.justificacion}</p>
          </div>

          {/* Secciones */}
          <div className="p-5 flex-1">
            <div className="mb-3" style={{ color: '#4b5563', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Secciones del documento
            </div>
            {data.sections.map(sec => {
              const isActive = activeSection === sec.id
              const needsReview = sec.requiereRevision
              const isReviewed = reviewedSections.has(sec.id)

              let color = '#4b5563'
              let borderColor = 'transparent'
              let bg = 'transparent'

              if (needsReview && isReviewed) {
                color = isActive ? '#4ade80' : '#16a34a'
                borderColor = isActive ? '#4ade80' : 'transparent'
                bg = isActive ? 'rgba(74,222,128,0.06)' : 'transparent'
              } else if (needsReview && !isReviewed) {
                color = isActive ? '#fef08a' : '#a16207'
                borderColor = isActive ? '#fef08a' : 'transparent'
                bg = isActive ? 'rgba(254,240,138,0.06)' : 'transparent'
              } else {
                color = isActive ? 'white' : '#4b5563'
                borderColor = isActive ? 'var(--hg-red)' : 'transparent'
                bg = isActive ? 'rgba(255,255,255,0.04)' : 'transparent'
              }

              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className="w-full text-left px-3 py-2.5 mb-1 flex items-start gap-2.5 transition-all"
                  style={{ background: bg, color, borderLeft: `2px solid ${borderColor}`, fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}
                >
                  <span className="mt-0.5 flex-shrink-0" style={{ fontSize: '0.55rem' }}>
                    {needsReview && isReviewed ? '✓' : needsReview ? '▲' : '●'}
                  </span>
                  {sec.titulo}
                </button>
              )
            })}
          </div>

          {/* Progreso de revisión */}
          <div className="p-5 border-t" style={{ borderColor: '#1a1a1a' }}>
            <div className="mb-2 flex justify-between items-center">
              <span style={{ color: '#4b5563', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progreso de revisión</span>
              <span className="text-xs font-black" style={{ color: todasRevisadas ? '#4ade80' : '#fbbf24' }}>
                {reviewedSections.size}/{seccionesRevision.length}
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${seccionesRevision.length > 0 ? (reviewedSections.size / seccionesRevision.length) * 100 : 0}%`,
                  background: todasRevisadas ? '#16a34a' : '#f59e0b',
                }}
              />
            </div>
            <div className="mt-3 flex gap-3 text-xs" style={{ color: '#4b5563', fontSize: '0.6rem' }}>
              <span>▲ Pendiente</span>
              <span style={{ color: '#16a34a' }}>✓ Revisado</span>
              <span>● Estándar</span>
            </div>
          </div>
        </aside>

        {/* ÁREA DEL DOCUMENTO */}
        <main className="flex-1 p-8" style={{ marginLeft: 272 }}>

          {/* Alertas críticas detectadas por el motor jurídico (riesgo procesal) */}
          {Array.isArray(data.alertasCriticas) && data.alertasCriticas.length > 0 && (
            <div className="mb-6 px-5 py-4" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid var(--hg-red)' }}>
              <p className="font-black text-xs uppercase tracking-widest mb-2" style={{ color: '#991b1b' }}>
                {data.alertasCriticas.length} alerta{data.alertasCriticas.length > 1 ? 's' : ''} crítica{data.alertasCriticas.length > 1 ? 's' : ''} de riesgo procesal
              </p>
              <ul className="space-y-1.5">
                {data.alertasCriticas.map((alerta, i) => (
                  <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: '#7f1d1d' }}>
                    <span className="flex-shrink-0">▲</span>
                    <span>{alerta}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Banner global */}
          {todasRevisadas ? (
            <div className="mb-6 px-5 py-4 flex items-center gap-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a' }}>
              <div className="w-6 h-6 flex items-center justify-center font-black text-sm" style={{ background: '#16a34a', color: 'white' }}>✓</div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest" style={{ color: '#14532d' }}>Todas las secciones han sido revisadas</p>
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>El documento está listo para exportar. Haz clic en "Exportar documento limpio" para generar el PDF final sin marcadores.</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 px-5 py-4 flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b' }}>
              <div className="w-6 h-6 flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5" style={{ background: '#f59e0b', color: 'white' }}>!</div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest mb-0.5" style={{ color: '#92400e' }}>
                  {pendientes.length} sección{pendientes.length > 1 ? 'es' : ''} requiere{pendientes.length === 1 ? '' : 'n'} revisión antes de exportar
                </p>
                <p className="text-xs" style={{ color: '#a16207' }}>
                  Revisa cada sección amarilla, edita el contenido si es necesario y marca el checkmark para confirmar. Cuando todas estén en verde, el documento queda listo.
                </p>
              </div>
            </div>
          )}

          {/* Documento */}
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: 760, border: '1px solid #d4d4d4' }}>

            {/* Header del documento */}
            <div className="px-10 py-6 border-b" style={{ background: 'var(--hg-black)', borderColor: '#1a1a1a' }}>
              <div className="flex items-center justify-between mb-4">
                <HGLogoSmall />
                <div className="text-right">
                  <div style={{ color: '#4b5563', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Borrador — validado por abogado</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {data.generadoEn ? new Date(data.generadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </div>
                </div>
              </div>
              <div className="font-black text-white uppercase" style={{ fontSize: '1.1rem', letterSpacing: '0.1em' }}>Contestación de Demanda</div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#6b7280' }}>
                {data.metadata.tipoProceso} · {data.metadata.juzgado}
              </div>
            </div>

            {/* Secciones */}
            <div className="divide-y" style={{ borderColor: '#f0f0f0' }}>
              {data.sections.map(sec => (
                <DocumentSection
                  key={sec.id}
                  section={sec}
                  isActive={activeSection === sec.id}
                  isReviewed={reviewedSections.has(sec.id)}
                  onToggleReviewed={() => toggleReviewed(sec.id)}
                  sectionRef={(el) => { sectionRefs.current[sec.id] = el }}
                  contentRef={(el) => { contentRefs.current[sec.id] = el }}
                />
              ))}

              {/* Notificaciones y firma — bloque fijo, generado por el sistema (no por la IA) */}
              <div className="px-10 py-6" style={{ background: 'white' }}>
                <h2
                  className="font-black text-xs uppercase tracking-widest mb-4"
                  style={{ color: '#1a1a1a', letterSpacing: '0.12em', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}
                >
                  VIII. NOTIFICACIONES Y FIRMA
                </h2>
                <p className="text-sm mb-8" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif', lineHeight: 1.9 }}>
                  El suscrito apoderado judicial recibirá notificaciones en la Secretaría del Despacho y por los demás medios que el Juzgado disponga.
                </p>
                <p className="text-sm mb-10" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                  Del señor Juez, respetuosamente,
                </p>
                <div>
                  {userProfile?.firma_base64 ? (
                    <img src={userProfile.firma_base64} alt="Firma" style={{ height: 60, width: 'auto', display: 'block' }} />
                  ) : (
                    <div style={{ borderBottom: '1px solid #9ca3af', width: 240, marginBottom: 4, height: 1 }} />
                  )}
                  <div className="text-sm font-semibold mt-1" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                    {userProfile?.nombre || 'Nombre del abogado'}
                  </div>
                  <div className="text-sm" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                    C.C. No. {userProfile?.cedula || '___'}
                  </div>
                  <div className="text-sm" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                    T.P. No. {userProfile?.tarjeta_profesional || '___'} del C.S. de la J.
                  </div>
                  <div className="text-sm" style={{ color: '#1a1a1a', fontFamily: 'Georgia, serif' }}>
                    Apoderado Judicial de {data.metadata.demandado || ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className="px-10 py-5 border-t" style={{ borderColor: '#f0f0f0', background: '#fafafa' }}>
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                LitigIA · Hurtado Gandini Abogados S.A.S.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ─── Sección del documento ─── */
function DocumentSection({
  section,
  isActive,
  isReviewed,
  onToggleReviewed,
  sectionRef,
  contentRef,
}: {
  section: SeccionContestacion
  isActive: boolean
  isReviewed: boolean
  onToggleReviewed: () => void
  sectionRef: (el: HTMLDivElement | null) => void
  contentRef: (el: HTMLDivElement | null) => void
}) {
  const localRef = useCallback((el: HTMLDivElement | null) => { sectionRef(el) }, [sectionRef])

  if (section.requiereRevision) {
    const reviewedStyle = {
      bg: isReviewed ? '#f0fdf4' : (isActive ? '#fffef5' : 'white'),
      bannerBg: isReviewed ? '#f0fdf4' : '#fefce8',
      bannerBorder: isReviewed ? '#bbf7d0' : '#fde68a',
      bannerLeft: isReviewed ? '#16a34a' : '#f59e0b',
      iconBg: isReviewed ? '#16a34a' : '#f59e0b',
      titleColor: isReviewed ? '#14532d' : '#92400e',
      textColor: isReviewed ? '#16a34a' : '#a16207',
      contentBg: isReviewed ? '#f0fdf4' : '#fefce8',
      contentBorder: isReviewed ? '#bbf7d0' : '#fde68a',
    }

    return (
      <div
        ref={localRef}
        data-section-id={section.id}
        style={{ background: reviewedStyle.bg, transition: 'background 0.4s' }}
      >
        {/* Banner de revisión */}
        <div
          className="mx-10 mt-6 mb-0 flex items-start gap-3 px-4 py-3"
          style={{ background: reviewedStyle.bannerBg, border: `1px solid ${reviewedStyle.bannerBorder}`, borderLeft: `3px solid ${reviewedStyle.bannerLeft}`, transition: 'all 0.4s' }}
        >
          <div className="w-5 h-5 flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5 transition-colors" style={{ background: reviewedStyle.iconBg, color: 'white' }}>
            {isReviewed ? '✓' : '!'}
          </div>
          <div className="flex-1">
            <div className="font-black text-xs uppercase tracking-widest mb-0.5" style={{ color: reviewedStyle.titleColor }}>
              {isReviewed ? 'Sección revisada por el abogado' : 'Requiere revisión del abogado'}
            </div>
            <div className="text-xs" style={{ color: reviewedStyle.textColor, lineHeight: 1.5 }}>
              {isReviewed ? 'Esta sección ha sido verificada. Puedes desmarcarla si necesitas revisarla de nuevo.' : section.motivoRevision}
            </div>
          </div>
          {/* Botón de revisión */}
          <button
            onClick={onToggleReviewed}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-black text-xs uppercase tracking-widest transition-all"
            style={{
              background: isReviewed ? '#16a34a' : 'var(--hg-black)',
              color: 'white',
              border: `1px solid ${isReviewed ? '#16a34a' : '#3a3a3a'}`,
            }}
            onMouseEnter={e => { if (!isReviewed) e.currentTarget.style.borderColor = '#f59e0b' }}
            onMouseLeave={e => { if (!isReviewed) e.currentTarget.style.borderColor = '#3a3a3a' }}
          >
            {isReviewed ? '✓ Revisado' : 'Marcar revisado'}
          </button>
        </div>

        <div className="px-10 py-6">
          <h2
            className="font-black text-xs uppercase tracking-widest mb-4"
            style={{ color: isReviewed ? '#14532d' : '#92400e', letterSpacing: '0.12em' }}
          >
            {section.titulo}
          </h2>
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className="text-sm outline-none"
            style={{
              color: '#1a1a1a',
              whiteSpace: 'pre-wrap',
              background: reviewedStyle.contentBg,
              border: `1px solid ${reviewedStyle.contentBorder}`,
              padding: '16px 20px',
              lineHeight: 1.9,
              fontFamily: 'Georgia, serif',
              minHeight: 80,
              transition: 'background 0.4s, border-color 0.4s',
            }}
            onFocus={e => { if (!isReviewed) e.currentTarget.style.borderColor = '#f59e0b' }}
            onBlur={e => { e.currentTarget.style.borderColor = isReviewed ? '#bbf7d0' : '#fde68a' }}
          >
            {section.contenido}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={localRef}
      data-section-id={section.id}
      className="px-10 py-6"
      style={{ background: isActive ? '#fafafa' : 'white', transition: 'background 0.3s' }}
    >
      <h2
        className="font-black text-xs uppercase tracking-widest mb-4"
        style={{ color: '#1a1a1a', letterSpacing: '0.12em', borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}
      >
        {section.titulo}
      </h2>
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className="text-sm outline-none"
        style={{ color: '#1a1a1a', whiteSpace: 'pre-wrap', lineHeight: 1.9, fontFamily: 'Georgia, serif', minHeight: 40 }}
      >
        {section.contenido}
      </div>
    </div>
  )
}

function HGLogoSmall() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-hg.webp"
        alt="Hurtado Gandini"
        style={{ height: 22, width: 'auto', display: 'block' }}
      />
      <span className="font-black text-xs tracking-widest uppercase" style={{ color: '#4b5563' }}>/ LitigIA</span>
    </div>
  )
}
