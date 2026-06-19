export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Ingresa correo y contraseña.' }, { status: 400 })
    }

    const rows = await sql`SELECT * FROM litigia_users WHERE email = ${email.toLowerCase().trim()}`
    const user = rows[0]

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 })
    }

    const token = await signToken({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      cargo: user.cargo,
      tarjeta_profesional: user.tarjeta_profesional,
    })

    const res = NextResponse.json({ ok: true, nombre: user.nombre, cargo: user.cargo })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    })
    return res
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
