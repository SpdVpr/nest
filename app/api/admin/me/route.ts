import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]

        // Check if it's a legacy admin token (matches ADMIN_PASSWORD)
        if (token === process.env.ADMIN_PASSWORD) {
            return NextResponse.json({
                user: {
                    uid: 'legacy',
                    email: 'admin@local',
                    name: 'Admin (heslo)',
                    role: 'admin',
                    created_at: new Date().toISOString(),
                    approved: true,
                }
            })
        }

        // Verify Firebase ID token
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)

        let decodedToken
        try {
            decodedToken = await auth.verifyIdToken(token)
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const db = getFirebaseAdminDb()
        const userDoc = await db.collection('admin_users').doc(decodedToken.uid).get()

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const userData = userDoc.data()
        return NextResponse.json({
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: userData?.name || decodedToken.email,
                role: userData?.role || 'brigadnik',
                created_at: userData?.created_at || new Date().toISOString(),
                approved: userData?.approved || false,
            }
        })
    } catch (error) {
        console.error('Error in /api/admin/me:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
