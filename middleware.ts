import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'litigia-hurtado-gandini-2026-xK9mP3qR'
)

// Rutas que NO requieren autenticación
const PUBLIC_EXACT = ['/']
const PUBLIC_PREFIX = ['/login', '/api/auth/login', '/api/auth/setup']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Archivos estáticos y rutas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|webp|jpg|jpeg|svg|css|js|woff|woff2)$/) ||
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIX.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('litigia_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('litigia_session')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
