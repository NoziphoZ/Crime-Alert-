import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/payment',
  '/forget-password',
  '/reset-password',
  '/role-redirect',
  '/api/auth',
  '/api/payment',
   '/api/register',
  '/api/forget-password',
  '/api/reset-password',
  '/api/auth/check',
  '/api/auth/logout',
]

const PROTECTED_PATHS = [
  '/citizendashboard',
  '/citizenreportform',
  '/emergencybutton',
  '/emergency-status-tracking',
  '/crimemap',
  '/law-enforcement-dashboard',
  '/admin-dashboard',
  '/manager-users',
]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Static assets and public routes — always allow
  if (isPublic(pathname)) return NextResponse.next()

  // Check for a valid session cookie (works for both http and https)
  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For protected dashboard routes, check whether the trial has expired
  if (isProtected(pathname)) {
    try {
      const checkUrl = new URL('/api/payment', req.url)
      const res = await fetch(checkUrl.toString(), {
        headers: {
          // Forward cookies so the API route can identify the user
          cookie: req.headers.get('cookie') ?? '',
        },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.trialExpired) {
          const paymentUrl = new URL('/payment', req.url)
          paymentUrl.searchParams.set('reason', 'trial_expired')
          return NextResponse.redirect(paymentUrl)
        }
      }
    } catch {
      // Fail open — don't lock users out on a transient DB/network error
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
}