export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

/**
 * GET /api/casos/alertas?dias=2
 * Casos con seguimiento activo del abogado logueado que vencen dentro de
 * los próximos N días hábiles/calendario (por defecto 2) o que ya vencieron
 * y siguen pendientes — para el banner de notificación al entrar a la app.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const dias = Number(req.nextUrl.searchParams.get('dias')) || 2

  try {
    const rows = await sql`
      SELECT id, demandante, demandado, radicado, juzgado, tipo_proceso, fecha_vencimiento
      FROM litigia_casos
      WHERE user_id = ${session.id}
        AND seguimiento_activo = TRUE
        AND estado = 'pendiente'
        AND fecha_vencimiento IS NOT NULL
        AND fecha_vencimiento <= (CURRENT_DATE + ${dias}::int)
      ORDER BY fecha_vencimiento ASC
    `
    return NextResponse.json({ alertas: rows })
  } catch (error) {
    console.error('Error consultando alertas de casos:', error)
    // No romper la UI por esto — simplemente no hay alertas que mostrar.
    return NextResponse.json({ alertas: [] })
  }
}
