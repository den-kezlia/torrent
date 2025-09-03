import { NextResponse, type NextRequest } from 'next/server'

const isProd = process.env.NODE_ENV === 'production'
const USER = process.env.BASIC_AUTH_USER || ''
const PASS = process.env.BASIC_AUTH_PASS || ''

export function middleware(req: NextRequest) {
  if (!isProd || !USER || !PASS) return NextResponse.next()

  const basicAuth = req.headers.get('authorization')
  if (basicAuth) {
    const parts = basicAuth.split(' ')
    const scheme = parts[0]
    const hash = parts[1]
    if (scheme?.toLowerCase() === 'basic' && hash) {
      try {
        const decoded = atob(hash)
        const idx = decoded.indexOf(':')
        const user = decoded.slice(0, Math.max(0, idx))
        const pwd = decoded.slice(Math.max(0, idx + 1))
        if (user === USER && pwd === PASS) return NextResponse.next()
      } catch {}
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
  })
}

export const config = {
  matcher: [
    // Protect everything except Next.js internals and common public assets
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|assets).*)'
  ]
}
