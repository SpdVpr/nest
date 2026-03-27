import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { getSessionBySlug, getUnclaimedGuestsBySessionId } from '@/lib/firebase/queries'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        await auth.verifyIdToken(token)

        const { slug } = await params
        const session = await getSessionBySlug(slug)

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const guests = await getUnclaimedGuestsBySessionId(session.id)

        return NextResponse.json({
            guests: guests.map(g => ({
                id: g.id,
                name: g.name,
                nights_count: g.nights_count,
                check_in_date: g.check_in_date,
                check_out_date: g.check_out_date,
            })),
        })
    } catch (error: any) {
        console.error('Event unclaimed guests error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch unclaimed guests' }, { status: 500 })
    }
}
