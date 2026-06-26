// apps/web/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:8000'

const protectedRoutes = ['/dashboard'] // add paths you want protected
const authRoutes = ['/signIn']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    const isProtected = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
    const isAuthRoute = authRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    )

    if (!isProtected && !isAuthRoute) {
        return NextResponse.next()
    }

    const sessionRes = await fetch(`${API_URL}/api/auth/get-session`, {
        headers: {
            cookie: request.headers.get('cookie') ?? '',
        },
    })

    const session = sessionRes.ok ? await sessionRes.json() : null
    const isAuthenticated = !!session?.user

    if (isProtected && !isAuthenticated) {
        const signInUrl = new URL('/signIn', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
    }

    if (isAuthRoute && isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
