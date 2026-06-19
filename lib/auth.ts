import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'litigia-hurtado-gandini-2026-xK9mP3qR'
)

export const COOKIE_NAME = 'litigia_session'

export interface UserPayload {
  id: number
  email: string
  nombre: string
  cargo: string
  tarjeta_profesional: string | null
}

export async function signToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
