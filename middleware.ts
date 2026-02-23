import { NextRequest, NextResponse } from 'next/server'

// This middleware intercepts /api/admin/* requests.
// If the token is a Firebase ID token (not the legacy admin password),
// it verifies it via an internal API call and replaces the Authorization header
// with the legacy admin password so existing verifyAuth() functions work unchanged.

export async function middleware(request: NextRequest) {
    // Only process admin API routes
    if (!request.nextUrl.pathname.startsWith('/api/admin')) {
        return NextResponse.next()
    }

    // Skip auth-related endpoints - they handle verification themselves
    const skipPaths = ['/api/admin/login', '/api/admin/register', '/api/admin/me', '/api/admin/users']
    if (skipPaths.some(p => request.nextUrl.pathname === p)) {
        return NextResponse.next()
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If it's already the admin password, let it through
    if (token === process.env.ADMIN_PASSWORD) {
        return NextResponse.next()
    }

    // It's not the admin password, so try to verify as Firebase ID token
    // by calling our internal /api/admin/me endpoint
    try {
        const meUrl = new URL('/api/admin/me', request.nextUrl.origin)
        const meResponse = await fetch(meUrl.toString(), {
            headers: { 'Authorization': `Bearer ${token}` },
        })

        if (!meResponse.ok) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const meData = await meResponse.json()

        if (!meData.user?.approved) {
            return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
        }

        // Rewrite the Authorization header with the admin password
        // so existing route handlers' verifyAuth() functions work unchanged
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('authorization', `Bearer ${process.env.ADMIN_PASSWORD}`)
        // Pass role info for permission checks
        requestHeaders.set('x-admin-role', meData.user.role || 'brigadnik')
        requestHeaders.set('x-admin-uid', meData.user.uid || '')
        requestHeaders.set('x-admin-name', meData.user.name || '')

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })
    } catch (error) {
        console.error('Middleware auth error:', error)
        return NextResponse.json({ error: 'Auth verification failed' }, { status: 500 })
    }
}

export const config = {
    matcher: '/api/admin/:path*',
}
