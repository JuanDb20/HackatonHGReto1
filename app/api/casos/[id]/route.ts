export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

const ESTADOS_VALIDOS = ['pendiente', 'contestado', 'archivado']

/**
 * GET /api/casos/:id
 * Devuelve el caso completo, incluyendo el snapshot de la contestación
 * generada (contestacion_json), para reabrirlo en el editor. Solo el
 * abogado dueño del caso puede verlo.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { id } = await params
  const casoId = Number(id)
  if (!Number.isInteger(casoId)) {
    return NextResponse.json({ error: 'Id de caso inválido.' }, { status: 400 })
  }

  try {
    const rows = await sql`
      SELECT id, demandante, demandado, radicado, juzgado, tipo_proceso,
             fecha_notificacion, termino_dias, fecha_vencimiento,
             seguimiento_activo, estado, contestacion_json, created_at
      FROM litigia_casos WHERE id = ${casoId} AND user_id = ${session.id}
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Caso no encontrado.' }, { status: 404 })
    }
    return NextResponse.json({ caso: rows[0] })
  } catch (error) {
    console.error('Error obteniendo caso:', error)
    return NextResponse.json({ error: 'No se pudo cargar el caso.' }, { status: 500 })
  }
}

/**
 * PATCH /api/casos/:id
 * Body admite cualquier combinación de:
 *   - { activarSeguimiento: true, fechaVencimiento: "YYYY-MM-DD" }  → activa el seguimiento de términos con la fecha que el abogado confirmó/editó
 *   - { estado: "contestado" | "archivado" | "pendiente" }          → cambia el estado del caso
 *   - { fechaVencimiento: "YYYY-MM-DD" }                            → corrige la fecha de vencimiento de un caso ya en seguimiento
 * Solo el abogado dueño del caso puede modificarlo.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { id } = await params
  const casoId = Number(id)
  if (!Number.isInteger(casoId)) {
    return NextResponse.json({ error: 'Id de caso inválido.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { activarSeguimiento, fechaVencimiento, estado } = body as {
    activarSeguimiento?: boolean
    fechaVencimiento?: string | null
    estado?: string
  }

  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
  }
  if (fechaVencimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)) {
    return NextResponse.json({ error: 'Fecha de vencimiento inválida, usa formato YYYY-MM-DD.' }, { status: 400 })
  }
  if (activarSeguimiento && !fechaVencimiento) {
    return NextResponse.json({ error: 'Para activar el seguimiento debes indicar la fecha de vencimiento.' }, { status: 400 })
  }

  try {
    // Verifica propiedad del caso antes de tocar nada.
    const existente = await sql`SELECT id FROM litigia_casos WHERE id = ${casoId} AND user_id = ${session.id}`
    if (existente.length === 0) {
      return NextResponse.json({ error: 'Caso no encontrado.' }, { status: 404 })
    }

    if (activarSeguimiento) {
      await sql`
        UPDATE litigia_casos
        SET seguimiento_activo = TRUE, fecha_vencimiento = ${fechaVencimiento}, updated_at = NOW()
        WHERE id = ${casoId}
      `
    } else if (fechaVencimiento) {
      await sql`
        UPDATE litigia_casos SET fecha_vencimiento = ${fechaVencimiento}, updated_at = NOW()
        WHERE id = ${casoId}
      `
    }

    if (estado) {
      await sql`UPDATE litigia_casos SET estado = ${estado}, updated_at = NOW() WHERE id = ${casoId}`
    }

    const rows = await sql`
      SELECT id, demandante, demandado, radicado, juzgado, tipo_proceso,
             fecha_notificacion, termino_dias, fecha_vencimiento,
             seguimiento_activo, estado, created_at
      FROM litigia_casos WHERE id = ${casoId}
    `
    return NextResponse.json({ caso: rows[0] })
  } catch (error) {
    console.error('Error actualizando caso:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el caso.' }, { status: 500 })
  }
}
