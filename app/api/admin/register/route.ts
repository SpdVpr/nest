import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

// POST - Register a new admin user (after Firebase Auth signup on client)
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)

        let decodedToken
        try {
            decodedToken = await auth.verifyIdToken(token)
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        const { name } = await request.json()

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()

        // Check if user already exists
        const existing = await db.collection('admin_users').doc(decodedToken.uid).get()
        if (existing.exists) {
            return NextResponse.json({ error: 'User already registered' }, { status: 409 })
        }

        // Create admin user document (not approved by default)
        const userData = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: name.trim(),
            role: 'brigadnik', // Default role
            created_at: new Date().toISOString(),
            approved: false, // Must be approved by admin
        }

        await db.collection('admin_users').doc(decodedToken.uid).set(userData)

        return NextResponse.json({ user: userData })
    } catch (error) {
        console.error('Error in register:', error)
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
}
