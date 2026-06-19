export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSession } from '@/lib/auth'
import sql from '@/lib/db'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('foto') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'La foto no puede superar 5 MB' }, { status: 400 })
  }

  const ext = file.type.split('/')[1] || 'jpg'
  const key = `fotos/${session.id}-${Date.now()}.${ext}`
  const bucket = process.env.AWS_S3_BUCKET!
  const region = process.env.AWS_REGION || 'us-east-2'

  const buffer = Buffer.from(await file.arrayBuffer())

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }))

  const foto_url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

  await sql`UPDATE litigia_users SET foto_url = ${foto_url} WHERE id = ${session.id}`

  return NextResponse.json({ ok: true, foto_url })
}
