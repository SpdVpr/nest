import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { verifyAdminRequest } from '@/lib/verify-admin'

// GET /api/admin/registered-users - List all registered (Firebase Auth) users with their claimed guests
export async function GET(request: NextRequest) {
    const admin = await verifyAdminRequest(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const db = getFirebaseAdminDb()

        // Get all users from the users collection
        const usersSnap = await db.collection('users').get()
        const sessionsSnap = await db.collection('sessions').get()

        const sessionsMap: Record<string, { name: string; slug: string; start_date: string }> = {}
        sessionsSnap.docs.forEach(doc => {
            const data = doc.data()
            sessionsMap[doc.id] = {
                name: data.name || '',
                slug: data.slug || '',
                start_date: data.start_date?.toDate?.()?.toISOString() || data.start_date || '',
            }
        })

        // Get all guests that have a user_id
        const claimedGuestsSnap = await db.collection('guests')
            .where('is_active', '==', true)
            .get()

        // Group guests by user_id
        const guestsByUser: Record<string, Array<{ id: string; name: string; session_id: string; session_name: string; session_slug: string; nights_count: number }>> = {}
        claimedGuestsSnap.docs.forEach(doc => {
            const data = doc.data()
            if (!data.user_id) return
            if (!guestsByUser[data.user_id]) guestsByUser[data.user_id] = []
            const session = sessionsMap[data.session_id]
            guestsByUser[data.user_id].push({
                id: doc.id,
                name: data.name || '',
                session_id: data.session_id,
                session_name: session?.name || 'Neznámý event',
                session_slug: session?.slug || '',
                nights_count: data.nights_count || 0,
            })
        })

        const users = usersSnap.docs.map(doc => {
            const data = doc.data()
            return {
                uid: doc.id,
                email: data.email || '',
                display_name: data.display_name || '',
                auth_provider: data.auth_provider || 'email',
                avatar_url: data.avatar_url || null,
                created_at: data.created_at || '',
                guests: guestsByUser[doc.id] || [],
            }
        })

        // Sort by created_at desc
        users.sort((a, b) => b.created_at.localeCompare(a.created_at))

        // Also return all sessions for the assign modal
        const allSessions = sessionsSnap.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                name: data.name || '',
                slug: data.slug || '',
                start_date: data.start_date?.toDate?.()?.toISOString() || data.start_date || '',
            }
        }).sort((a, b) => b.start_date.localeCompare(a.start_date))

        // All active guests without user_id (for manual assignment)
        const unclaimedGuests: Array<{ id: string; name: string; session_id: string; session_name: string }> = []
        claimedGuestsSnap.docs.forEach(doc => {
            const data = doc.data()
            if (data.user_id) return
            const session = sessionsMap[data.session_id]
            unclaimedGuests.push({
                id: doc.id,
                name: data.name || '',
                session_id: data.session_id,
                session_name: session?.name || 'Neznámý event',
            })
        })

        return NextResponse.json({ users, sessions: allSessions, unclaimedGuests })
    } catch (error) {
        console.error('Error fetching registered users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

// POST /api/admin/registered-users - Assign a guest to a user
export async function POST(request: NextRequest) {
    const admin = await verifyAdminRequest(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { action, user_id, guest_id } = await request.json()
        const db = getFirebaseAdminDb()

        if (action === 'assign') {
            if (!user_id || !guest_id) {
                return NextResponse.json({ error: 'user_id and guest_id required' }, { status: 400 })
            }

            const guestRef = db.collection('guests').doc(guest_id)
            const guestDoc = await guestRef.get()

            if (!guestDoc.exists) {
                return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
            }

            if (guestDoc.data()?.user_id) {
                return NextResponse.json({ error: 'Guest already assigned to a user' }, { status: 409 })
            }

            await guestRef.update({ user_id })
            return NextResponse.json({ success: true })
        }

        if (action === 'unassign') {
            if (!guest_id) {
                return NextResponse.json({ error: 'guest_id required' }, { status: 400 })
            }

            const guestRef = db.collection('guests').doc(guest_id)
            await guestRef.update({ user_id: null })
            return NextResponse.json({ success: true })
        }

        if (action === 'delete_user') {
            if (!user_id) {
                return NextResponse.json({ error: 'user_id required' }, { status: 400 })
            }

            // Unlink all guests from this user
            const guestsSnap = await db.collection('guests')
                .where('user_id', '==', user_id)
                .get()

            const batch = db.batch()
            guestsSnap.docs.forEach(doc => {
                batch.update(doc.ref, { user_id: null })
            })

            // Delete user profile
            batch.delete(db.collection('users').doc(user_id))
            await batch.commit()

            // Delete from Firebase Auth
            try {
                const { getAuth } = await import('firebase-admin/auth')
                const { getFirebaseAdminApp } = await import('@/lib/firebase/admin')
                const auth = getAuth(getFirebaseAdminApp())
                await auth.deleteUser(user_id)
            } catch (e) {
                console.error('Failed to delete Firebase Auth user:', e)
            }

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error) {
        console.error('Error managing registered user:', error)
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    }
}
