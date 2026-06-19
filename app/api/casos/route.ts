export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

/** GET /api/casos — lista los casos del abogado logueado (más reciente primero). */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  try {
    const rows = await sql`
      SELECT id, demandante, demandado, radicado, juzgado, tipo_proceso,
             fecha_notificacion, termino_dias, fecha_vencimiento,
             seguimiento_activo, estado, created_at
      FROM litigia_casos
      WHERE user_id = ${session.id}
      ORDER BY
        seguimiento_activo DESC,
        fecha_vencimiento ASC NULLS LAST,
        created_at DESC
    `
    return NextResponse.json({ casos: rows })
  } catch (error) {
    console.error('Error listando casos:', error)
    return NextResponse.json({ error: 'No se pudieron cargar los casos. ¿Falta correr /api/casos/setup?' }, { status: 500 })
  }
}
