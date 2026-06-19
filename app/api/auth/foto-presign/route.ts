export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getSession } from '@/lib/auth'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'image/jpeg'
  const ext = type.split('/')[1] || 'jpg'

  const key = `fotos/${session.id}-${Date.now()}.${ext}`
  const bucket = process.env.AWS_S3_BUCKET!

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: type,
    // Limitar tamaño a 5MB en el Content-Length header del cliente
  })

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`

  return NextResponse.json({ presignedUrl, publicUrl })
}
