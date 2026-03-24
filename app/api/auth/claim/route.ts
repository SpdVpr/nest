import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

export async function POST(request: NextRequest) {
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
        const { guest_id } = body

        if (!guest_id) {
            return NextResponse.json({ error: 'guest_id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const guestRef = db.collection('guests').doc(guest_id)

        // Use a transaction to prevent race conditions
        const result = await db.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestRef)

            if (!guestDoc.exists) {
                throw new Error('GUEST_NOT_FOUND')
            }

            const guestData = guestDoc.data()!

            if (guestData.user_id) {
                throw new Error('GUEST_ALREADY_CLAIMED')
            }

            transaction.update(guestRef, {
                user_id: decodedToken.uid,
            })

            return {
                id: guestDoc.id,
                ...guestData,
                user_id: decodedToken.uid,
            }
        })

        return NextResponse.json({ guest: result })
    } catch (error: any) {
        console.error('Claim error:', error)

        if (error.message === 'GUEST_NOT_FOUND') {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }
        if (error.message === 'GUEST_ALREADY_CLAIMED') {
            return NextResponse.json({ error: 'This guest has already been claimed by another user' }, { status: 409 })
        }
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
    }
}
