import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

// GET /api/notifications - Get notifications for authenticated user
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        const decodedToken = await auth.verifyIdToken(token)

        const db = getFirebaseAdminDb()
        // Sort in memory to avoid composite index requirement
        const snap = await db.collection('notifications')
            .where('user_id', '==', decodedToken.uid)
            .get()

        const allNotifications = snap.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                user_id: data.user_id,
                type: data.type,
                title: data.title,
                body: data.body,
                session_id: data.session_id,
                is_read: data.is_read || false,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || '',
            }
        })

        // Sort desc by created_at and limit to 30
        allNotifications.sort((a, b) => b.created_at.localeCompare(a.created_at))
        const notifications = allNotifications.slice(0, 30)
        const unreadCount = allNotifications.filter(n => !n.is_read).length

        return NextResponse.json({ notifications, unreadCount })
    } catch (error: any) {
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        console.error('Notifications error:', error)
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        const decodedToken = await auth.verifyIdToken(token)

        const { notification_ids, mark_all_read } = await request.json()
        const db = getFirebaseAdminDb()

        if (mark_all_read) {
            const snap = await db.collection('notifications')
                .where('user_id', '==', decodedToken.uid)
                .where('is_read', '==', false)
                .get()

            const batch = db.batch()
            snap.docs.forEach(doc => batch.update(doc.ref, { is_read: true }))
            await batch.commit()
        } else if (notification_ids?.length > 0) {
            const batch = db.batch()
            for (const id of notification_ids) {
                const ref = db.collection('notifications').doc(id)
                batch.update(ref, { is_read: true })
            }
            await batch.commit()
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        console.error('Mark read error:', error)
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
    }
}
