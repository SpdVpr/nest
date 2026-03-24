import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { getAllSessions, getUnclaimedGuestsBySessionId } from '@/lib/firebase/queries'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        await auth.verifyIdToken(token)

        const sessions = await getAllSessions()

        const sessionsWithGuests = await Promise.all(
            sessions.map(async (session) => {
                const guests = await getUnclaimedGuestsBySessionId(session.id)
                return {
                    session: {
                        id: session.id,
                        name: session.name,
                        slug: session.slug,
                        start_date: session.start_date,
                        end_date: session.end_date,
                    },
                    guests: guests.map(g => ({
                        id: g.id,
                        name: g.name,
                        nights_count: g.nights_count,
                        check_in_date: g.check_in_date,
                        check_out_date: g.check_out_date,
                    })),
                }
            })
        )

        // Only return sessions that have unclaimed guests
        const filtered = sessionsWithGuests.filter(s => s.guests.length > 0)

        return NextResponse.json({ sessions: filtered })
    } catch (error: any) {
        console.error('Unclaimed guests error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch unclaimed guests' }, { status: 500 })
    }
}
