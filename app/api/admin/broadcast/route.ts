import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/admin/broadcast — Send broadcast to all users on an event
export async function POST(request: NextRequest) {
    try {
        const adminRole = request.headers.get('x-admin-role')
        const adminName = request.headers.get('x-admin-name') || 'Admin'
        // Allow legacy admin password (no role header) or admin/master_brigadnik roles
        if (adminRole && !['admin', 'master_brigadnik'].includes(adminRole)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { session_id, type, title, body } = await request.json()
        if (!session_id || !body) {
            return NextResponse.json({ error: 'session_id and body are required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()

        // 1. Write broadcast document
        const broadcastRef = await db.collection('broadcasts').add({
            session_id,
            type: type || 'info',
            title: title || 'Oznámení',
            body,
            created_by: adminName,
            created_at: FieldValue.serverTimestamp(),
        })

        // 2. Create notifications for all registered users on this event
        const guestsSnap = await db.collection('guests')
            .where('session_id', '==', session_id)
            .get()

        const registeredUserIds = new Set<string>()
        guestsSnap.docs.forEach(doc => {
            const uid = doc.data().user_id
            if (uid) registeredUserIds.add(uid)
        })

        if (registeredUserIds.size > 0) {
            const batch = db.batch()
            const typeEmoji = type === 'food' ? '🍽️' : type === 'urgent' ? '🚨' : type === 'fun' ? '🎮' : 'ℹ️'

            for (const userId of registeredUserIds) {
                const notifRef = db.collection('notifications').doc()
                batch.set(notifRef, {
                    user_id: userId,
                    type: 'broadcast',
                    title: `${typeEmoji} ${title || 'Oznámení'}`,
                    body,
                    session_id,
                    is_read: false,
                    created_at: FieldValue.serverTimestamp(),
                })
            }
            await batch.commit()
        }

        return NextResponse.json({
            success: true,
            broadcast_id: broadcastRef.id,
            notified_users: registeredUserIds.size,
        })
    } catch (error) {
        console.error('Broadcast error:', error)
        return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
    }
}

// GET /api/admin/broadcast?session_id=xxx — Get broadcast history for a session
export async function GET(request: NextRequest) {
    try {

        const sessionId = request.nextUrl.searchParams.get('session_id')
        if (!sessionId) {
            return NextResponse.json({ error: 'session_id required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const snap = await db.collection('broadcasts')
            .where('session_id', '==', sessionId)
            .get()

        const broadcasts = snap.docs.map(doc => {
            const d = doc.data()
            return {
                id: doc.id,
                type: d.type,
                title: d.title,
                body: d.body,
                created_by: d.created_by,
                created_at: d.created_at?.toDate?.()?.toISOString() || '',
            }
        })
        broadcasts.sort((a, b) => b.created_at.localeCompare(a.created_at))
        broadcasts.splice(20)

        return NextResponse.json({ broadcasts })
    } catch (error) {
        console.error('Broadcast list error:', error)
        return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
    }
}
