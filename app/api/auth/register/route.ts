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
        const { display_name, auth_provider } = body

        if (!display_name) {
            return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const userRef = db.collection('users').doc(decodedToken.uid)
        const existingUser = await userRef.get()

        if (existingUser.exists) {
            // User already registered — return existing profile
            return NextResponse.json({ user: { uid: decodedToken.uid, ...existingUser.data() } })
        }

        const now = new Date().toISOString()
        const userData = {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            display_name,
            auth_provider: auth_provider || 'email',
            avatar_url: decodedToken.picture || null,
            created_at: now,
            updated_at: now,
        }

        await userRef.set(userData)

        return NextResponse.json({ user: userData })
    } catch (error: any) {
        console.error('Auth register error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
}
