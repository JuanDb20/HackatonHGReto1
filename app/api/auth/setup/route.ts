export const runtime = 'nodejs'

/**
 * GET /api/auth/setup
 * Crea la tabla litigia_users y siembra los usuarios ficticios.
 * Ejecutar UNA SOLA VEZ. Idempotente: ON CONFLICT DO NOTHING.
 */

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'

const USUARIOS = [
  {
    email: 'fjhurtado@hgdsas.com',
    password: 'Langer2026!',
    nombre: 'Francisco José Hurtado Langer',
    cargo: 'Socio Director',
    tarjeta_profesional: '86.320',
    cedula: '16.829.57',
  },
  {
    email: 'f.gandini@hgdsas.com',
    password: 'Gandini2026!',
    nombre: 'Fernando Gandini',
    cargo: 'Socio Principal',
    tarjeta_profesional: '45.678',
    cedula: '17.234.567',
  },
  {
    email: 'm.hurtado@hgdsas.com',
    password: 'Hurtado2026!',
    nombre: 'María Camila Hurtado',
    cargo: 'Socia',
    tarjeta_profesional: '67.890',
    cedula: '1.143.896.234',
  },
  {
    email: 'a.torres@hgdsas.com',
    password: 'Torres2026!',
    nombre: 'Andrés Felipe Torres',
    cargo: 'Asociado Senior',
    tarjeta_profesional: '89.012',
    cedula: '1.130.652.789',
  },
  {
    email: 'l.morales@hgdsas.com',
    password: 'Morales2026!',
    nombre: 'Laura Valentina Morales',
    cargo: 'Asociada',
    tarjeta_profesional: '12.345',
    cedula: '1.006.783.456',
  },
  {
    email: 'demo@hgdsas.com',
    password: 'Demo2026!',
    nombre: 'Usuario Demo',
    cargo: 'Consultor',
    tarjeta_profesional: null,
    cedula: '1.234.567.890',
  },
]

export async function GET() {
  // 1. Crear tabla (incluye cedula y foto_url)
  await sql`
    CREATE TABLE IF NOT EXISTS litigia_users (
      id                  SERIAL PRIMARY KEY,
      email               VARCHAR(255) UNIQUE NOT NULL,
      password_hash       VARCHAR(255) NOT NULL,
      nombre              VARCHAR(255) NOT NULL,
      cargo               VARCHAR(255) NOT NULL,
      tarjeta_profesional VARCHAR(50),
      cedula              VARCHAR(30),
      firma_base64        TEXT,
      foto_url            TEXT,
      created_at          TIMESTAMP DEFAULT NOW()
    )
  `

  // 2. Migración: agregar columnas si la tabla ya existía sin ellas
  await sql`ALTER TABLE litigia_users ADD COLUMN IF NOT EXISTS cedula VARCHAR(30)`.catch(() => {})
  await sql`ALTER TABLE litigia_users ADD COLUMN IF NOT EXISTS foto_url TEXT`.catch(() => {})

  // 3. Insertar usuarios
  const creados: { email: string; password: string }[] = []
  for (const u of USUARIOS) {
    const hash = bcrypt.hashSync(u.password, 10)
    const rows = await sql`
      INSERT INTO litigia_users (email, password_hash, nombre, cargo, tarjeta_profesional, cedula)
      VALUES (${u.email}, ${hash}, ${u.nombre}, ${u.cargo}, ${u.tarjeta_profesional}, ${u.cedula})
      ON CONFLICT (email) DO UPDATE SET cedula = EXCLUDED.cedula
      RETURNING email
    `
    if (rows.length > 0) creados.push({ email: u.email, password: u.password })
  }

  return NextResponse.json({
    ok: true,
    mensaje: 'Tabla creada/actualizada y usuarios sembrados.',
    usuarios: USUARIOS.map(u => ({
      email: u.email,
      password: u.password,
      nombre: u.nombre,
      cedula: u.cedula,
      tarjeta_profesional: u.tarjeta_profesional,
    })),
  })
}
