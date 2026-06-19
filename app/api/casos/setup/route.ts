export const runtime = 'nodejs'

/**
 * GET /api/casos/setup
 * Crea la tabla litigia_casos. Ejecutar UNA SOLA VEZ. Idempotente.
 */

import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  await sql`
    CREATE TABLE IF NOT EXISTS litigia_casos (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL REFERENCES litigia_users(id) ON DELETE CASCADE,
      demandante          TEXT,
      demandado           TEXT,
      radicado            TEXT,
      juzgado             TEXT,
      tipo_proceso        TEXT,
      fecha_notificacion  DATE,
      termino_dias        INTEGER,
      fecha_vencimiento   DATE,
      seguimiento_activo  BOOLEAN NOT NULL DEFAULT FALSE,
      estado              TEXT NOT NULL DEFAULT 'pendiente',
      contestacion_json   JSONB,
      created_at          TIMESTAMP DEFAULT NOW(),
      updated_at          TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_litigia_casos_user ON litigia_casos(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_litigia_casos_vencimiento ON litigia_casos(fecha_vencimiento) WHERE seguimiento_activo = TRUE`

  return NextResponse.json({ ok: true, mensaje: 'Tabla litigia_casos creada/verificada.' })
}
