export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { firma_base64 } = await req.json()
  await sql`UPDATE litigia_users SET firma_base64 = ${firma_base64} WHERE id = ${session.id}`
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await sql`UPDATE litigia_users SET firma_base64 = NULL WHERE id = ${session.id}`
  return NextResponse.json({ ok: true })
}
