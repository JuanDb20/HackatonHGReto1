import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json(null, { status: 401 })

  const rows = await sql`
    SELECT id, email, nombre, cargo, tarjeta_profesional, cedula, firma_base64, foto_url
    FROM litigia_users
    WHERE id = ${session.id}
  `
  return NextResponse.json(rows[0] || null)
}
