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

        return NextResponse.json({ user, guests })
    } catch (error: any) {
        console.error('Auth me error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }
}
