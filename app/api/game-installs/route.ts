// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

// GET /api/game-installs?session_id=xxx - Get game install requests for a session
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('session_id')

        if (!sessionId) {
            return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('game_install_requests')
            .where('session_id', '==', sessionId)
            .get()

        const requests = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        })

        return NextResponse.json({ requests })
    } catch (error) {
        console.error('Error fetching game install requests:', error)
        return NextResponse.json({ error: 'Failed to fetch game install requests' }, { status: 500 })
    }
}

// POST /api/game-installs - Save game install request for a reservation
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { guest_id, session_id, reservation_ids, game_names } = body

        if (!guest_id || !session_id || !game_names || !Array.isArray(game_names)) {
            return NextResponse.json({ error: 'guest_id, session_id, and game_names are required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const now = Timestamp.now()

        // Delete any existing requests for this guest+session (replace approach)
        const existingSnap = await db.collection('game_install_requests')
            .where('guest_id', '==', guest_id)
            .where('session_id', '==', session_id)
            .get()

        const batch = db.batch()
        existingSnap.docs.forEach(doc => batch.delete(doc.ref))

        // Create new request
        const requestData = {
            guest_id,
            session_id,
            reservation_ids: reservation_ids || [],
            game_names, // array of game name strings
            created_at: now,
        }

        const docRef = db.collection('game_install_requests').doc()
        batch.set(docRef, requestData)
        await batch.commit()

        // Reset games_prepared flag for this guest (admin needs to re-check)
        try {
            const { FieldValue } = await import('firebase-admin/firestore')
            await db.collection('sessions').doc(session_id).update({
                [`games_prepared.${guest_id}`]: FieldValue.delete(),
            })
        } catch (e) {
            console.log('Could not reset games_prepared flag:', e)
        }

        return NextResponse.json({
            request: {
                id: docRef.id,
                ...requestData,
                created_at: now.toDate().toISOString(),
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error saving game install request:', error)
        return NextResponse.json({ error: 'Failed to save game install request' }, { status: 500 })
    }
}
