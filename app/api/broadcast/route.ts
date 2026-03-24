import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// GET /api/broadcast?session_id=xxx|slug=xxx&after=ISO_DATE
// Used by client-side LiveBroadcast component (polled every 5s)
export async function GET(request: NextRequest) {
    try {
        const db = getFirebaseAdminDb()
        let sessionId = request.nextUrl.searchParams.get('session_id')
        const slug = request.nextUrl.searchParams.get('slug')

        // Resolve slug to session_id if needed
        if (!sessionId && slug) {
            const sessSnap = await db.collection('sessions')
                .where('access_password', '==', slug)
                .limit(1)
                .get()
            if (sessSnap.empty) {
                return NextResponse.json({ broadcast: null })
            }
            sessionId = sessSnap.docs[0].id
        }

        if (!sessionId) {
            return NextResponse.json({ error: 'session_id or slug required' }, { status: 400 })
        }

        const after = request.nextUrl.searchParams.get('after')

        const snap = await db.collection('broadcasts')
            .where('session_id', '==', sessionId)
            .get()

        if (snap.empty) {
            return NextResponse.json({ broadcast: null })
        }

        // Sort in memory and pick the latest
        const sorted = snap.docs.sort((a, b) => {
            const aTime = a.data().created_at?.toDate?.()?.getTime() || 0
            const bTime = b.data().created_at?.toDate?.()?.getTime() || 0
            return bTime - aTime
        })
        const doc = sorted[0]
        const d = doc.data()
        const createdAt = d.created_at?.toDate?.()?.toISOString() || ''

        // If client already has this or newer, return null
        if (after && createdAt && createdAt <= after) {
            return NextResponse.json({ broadcast: null })
        }

        return NextResponse.json({
            broadcast: {
                id: doc.id,
                type: d.type,
                title: d.title,
                body: d.body,
                created_by: d.created_by,
                created_at: createdAt,
            },
        })
    } catch (error) {
        console.error('Broadcast poll error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
