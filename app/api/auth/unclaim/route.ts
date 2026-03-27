import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'

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

        const result = await db.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestRef)

            if (!guestDoc.exists) {
                throw new Error('GUEST_NOT_FOUND')
            }

            const guestData = guestDoc.data()!

            // Only the owner can unclaim
            if (guestData.user_id !== decodedToken.uid) {
                throw new Error('NOT_OWNER')
            }

            transaction.update(guestRef, {
                user_id: FieldValue.delete(),
            })

            return { id: guestDoc.id, name: guestData.name }
        })

        return NextResponse.json({ guest: result })
    } catch (error: any) {
        console.error('Unclaim error:', error)

        if (error.message === 'GUEST_NOT_FOUND') {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }
        if (error.message === 'NOT_OWNER') {
            return NextResponse.json({ error: 'You can only unclaim your own guest' }, { status: 403 })
        }
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        return NextResponse.json({ error: 'Unclaim failed' }, { status: 500 })
    }
}
