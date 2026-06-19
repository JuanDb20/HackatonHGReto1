'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: number
  email: string
  nombre: string
  cargo: string
  tarjeta_profesional: string | null
  cedula: string | null
  firma_base64: string | null
  foto_url: string | null
}

export default function PerfilPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  // Cargar perfil del usuario
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data) { router.push('/login'); return }
        setUser(data)
        // Si tiene firma guardada, pintarla en el canvas
        if (data.firma_base64) {
          const img = new Image()
          img.onload = () => {
            const canvas = canvasRef.current
            if (canvas) {
              const ctx = canvas.getContext('2d')
              ctx?.drawImage(img, 0, 0)
              setHasDrawn(true)
            }
          }
          img.src = data.firma_base64
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  // Helpers de coordenadas
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    setIsDrawing(true)
    setLastPos(pos)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !lastPos) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    setLastPos(pos)
  }

  const endDraw = () => {
    setIsDrawing(false)
    setLastPos(null)
  }

  const limpiarCanvas = useCallback(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setSaved(false)
  }, [])

  const guardarFirma = async () => {
    const canvas = canvasRef.current!
    const firma_base64 = canvas.toDataURL('image/png')
    setSaving(true)
    await fetch('/api/auth/firma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firma_base64 }),
    })
    setSaving(false)
    setSaved(true)
    setUser(prev => prev ? { ...prev, firma_base64 } : prev)
    setTimeout(() => setSaved(false), 3000)
  }

  const subirFoto = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploadingFoto(true)
    try {
      const form = new FormData()
      form.append('foto', file)
      const res = await fetch('/api/auth/foto-upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir la foto')
      setUser(prev => prev ? { ...prev, foto_url: data.foto_url } : prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir la foto')
    } finally {
      setUploadingFoto(false)
    }
  }

  const eliminarFoto = async () => {
    await fetch('/api/auth/foto', { method: 'DELETE' })
    setUser(prev => prev ? { ...prev, foto_url: null } : prev)
  }

  const eliminarFirma = async () => {
    await fetch('/api/auth/firma', { method: 'DELETE' })
    limpiarCanvas()
    setUser(prev => prev ? { ...prev, firma_base64: null } : prev)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hg-black)' }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--hg-red)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--hg-black)' }}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
        style={{ background: 'var(--hg-black)', borderBottom: '1px solid #1a1a1a', height: 56 }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/inicio')}
            className="text-xs uppercase tracking-widest font-semibold transition-colors"
            style={{ color: '#4b5563' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
          >
            ← Volver
          </button>
          <div className="w-px h-4" style={{ background: '#2a2a2a' }} />
          <img src="/logo-hg.webp" alt="Hurtado Gandini" style={{ height: 22, width: 'auto' }} />
        </div>
        <button
          onClick={logout}
          className="text-xs uppercase tracking-widest font-semibold transition-colors"
          style={{ color: '#4b5563' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
        >
          Cerrar sesión
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="pt-20 pb-16 px-6 max-w-2xl mx-auto">

        {/* DATOS DEL ABOGADO */}
        <div className="mb-8">
          <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hg-red)' }}>
            Perfil de usuario
          </div>
          <h1 className="font-black text-white text-2xl uppercase tracking-tight">{user.nombre}</h1>
        </div>

        {/* Tarjeta de datos */}
        <div className="mb-6 p-6" style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderTop: '3px solid var(--hg-red)' }}>
          <div className="flex items-center gap-5 mb-5">
            {/* Avatar con foto */}
            <div
              className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden flex items-center justify-center relative"
              style={{ border: '2px solid #2a2a2a', background: '#1a1a1a' }}
            >
              {user.foto_url ? (
                <img src={user.foto_url} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>
                  {user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <div>
              <div className="font-black text-white text-base">{user.nombre}</div>
              <div className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--hg-red)' }}>{user.cargo}</div>
              {user.tarjeta_profesional && (
                <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>T.P. {user.tarjeta_profesional}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Correo', val: user.email },
              { label: 'Cédula', val: user.cedula || 'No registrada' },
              { label: 'T.P.', val: user.tarjeta_profesional || 'No registrada' },
              { label: 'Firma', val: user.firma_base64 ? 'Registrada' : 'Sin firma' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#4b5563', fontSize: '0.58rem' }}>{item.label}</div>
                <div className="text-xs font-semibold text-white">{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOTO DE PERFIL */}
        <div className="mb-6" style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          <div style={{ background: '#1a1a1a', height: 3 }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-black uppercase tracking-widest text-white">Foto de perfil</div>
              {user.foto_url && (
                <button
                  onClick={eliminarFoto}
                  className="text-xs uppercase tracking-widest transition-colors"
                  style={{ color: '#4b5563' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                >
                  Eliminar foto
                </button>
              )}
            </div>
            <p className="text-xs mb-5" style={{ color: '#4b5563' }}>
              Aparece en tu avatar del sistema. Formatos: JPG, PNG, WEBP. Máximo 5 MB.
            </p>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f) }}
            />
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ border: '2px solid #2a2a2a', background: '#1a1a1a' }}
              >
                {user.foto_url ? (
                  <img src={user.foto_url} alt="Foto actual" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-white" style={{ fontSize: '1.4rem' }}>
                    {user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                )}
              </div>
              <button
                onClick={() => fotoInputRef.current?.click()}
                disabled={uploadingFoto}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
                style={{ border: '1px solid #2a2a2a', color: 'white', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a' }}
              >
                {uploadingFoto ? 'Subiendo...' : user.foto_url ? 'Cambiar foto' : 'Subir foto'}
              </button>
            </div>
          </div>
        </div>

        {/* FIRMA */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1a1a1a' }}>
          <div style={{ background: 'var(--hg-red)', height: 3 }} />
          <div className="p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-black uppercase tracking-widest text-white">Firma digital</div>
              {user.firma_base64 && !hasDrawn && (
                <span className="text-xs px-2 py-0.5 font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ✓ Guardada
                </span>
              )}
            </div>
            <p className="text-xs mb-5" style={{ color: '#4b5563' }}>
              Dibuja tu firma con el mouse o dedo. Aparecerá en el pie de página de todos los documentos que exportes.
            </p>

            {/* Canvas */}
            <div
              className="relative w-full mb-4"
              style={{ background: 'white', border: '1px solid #d4d4d4' }}
            >
              <canvas
                ref={canvasRef}
                width={560}
                height={160}
                className="w-full touch-none cursor-crosshair block"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasDrawn && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ color: '#d4d4d4', fontSize: '0.75rem', fontStyle: 'italic' }}
                >
                  Dibuja tu firma aquí
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={guardarFirma}
                disabled={!hasDrawn || saving}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-opacity disabled:opacity-30"
                style={{ background: saved ? '#16a34a' : 'var(--hg-red)' }}
                onMouseEnter={e => { if (hasDrawn && !saving) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {saving ? 'Guardando...' : saved ? '✓ Guardada' : 'Guardar firma'}
              </button>
              <button
                onClick={limpiarCanvas}
                disabled={!hasDrawn}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-30"
                style={{ border: '1px solid #2a2a2a', color: '#6b7280', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#6b7280' }}
              >
                Limpiar
              </button>
              {user.firma_base64 && (
                <button
                  onClick={eliminarFirma}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors"
                  style={{ border: '1px solid #3a0a0a', color: '#f87171', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a0a0a' }}
                >
                  Eliminar firma guardada
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nota */}
        <p className="mt-6 text-xs" style={{ color: '#2a2a2a' }}>
          La firma se almacena de forma segura y solo es visible en los documentos que tú exportes.
          Para cambiarla, dibuja una nueva y haz clic en Guardar.
        </p>
      </div>
    </div>
  )
}
