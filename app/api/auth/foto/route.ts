export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { foto_url } = await req.json()
  await sql`UPDATE litigia_users SET foto_url = ${foto_url} WHERE id = ${session.id}`
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await sql`UPDATE litigia_users SET foto_url = NULL WHERE id = ${session.id}`
  return NextResponse.json({ ok: true })
}
