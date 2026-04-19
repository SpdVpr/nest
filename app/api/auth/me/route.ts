import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { getUserProfile, getGuestsByUserId } from '@/lib/firebase/queries'

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

        const user = await getUserProfile(decodedToken.uid)
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const guests = await getGuestsByUserId(decodedToken.uid)

        // Attach session_slug to each guest so the client can map guests to URLs
        // without an extra round-trip per event.
        let guestsWithSlug: any[] = guests
        if (guests.length > 0) {
            const db = getFirebaseAdminDb()
            const sessionIds = Array.from(new Set(guests.map(g => g.session_id).filter(Boolean)))
            if (sessionIds.length > 0) {
                const refs = sessionIds.map(id => db.collection('sessions').doc(id))
                const docs = await db.getAll(...refs)
                const slugById = new Map<string, string>()
                docs.forEach(doc => {
                    if (doc.exists) slugById.set(doc.id, (doc.data() as any)?.slug || '')
                })
                guestsWithSlug = guests.map(g => ({ ...g, session_slug: slugById.get(g.session_id) || '' }))
            }
        }

        return NextResponse.json({ user, guests: guestsWithSlug })
    } catch (error: any) {
        console.error('Auth me error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}

// PATCH /api/auth/me - Update user profile (display_name)
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

        const body = await request.json()
        const { display_name } = body

        if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
            return NextResponse.json({ error: 'Jméno je povinné' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const trimmedName = display_name.trim()

        // Update Firestore user profile
        await db.collection('users').doc(decodedToken.uid).update({
            display_name: trimmedName,
            updated_at: new Date(),
        })

        // Update Firebase Auth display name
        await auth.updateUser(decodedToken.uid, { displayName: trimmedName })

        const updatedUser = await getUserProfile(decodedToken.uid)

        return NextResponse.json({ user: updatedUser })
    } catch (error: any) {
        console.error('Auth me PATCH error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
