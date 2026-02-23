import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

// Helper to verify admin access
async function verifyAdmin(request: NextRequest) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.split('Bearer ')[1]

    // Legacy admin token
    if (token === process.env.ADMIN_PASSWORD) {
        return { uid: 'legacy', role: 'admin' }
    }

    try {
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        const decoded = await auth.verifyIdToken(token)
        const db = getFirebaseAdminDb()
        const userDoc = await db.collection('admin_users').doc(decoded.uid).get()
        if (!userDoc.exists) return null
        const userData = userDoc.data()
        if (userData?.role !== 'admin') return null
        return { uid: decoded.uid, role: 'admin' }
    } catch {
        return null
    }
}

// GET - List all admin users
export async function GET(request: NextRequest) {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('admin_users').orderBy('created_at', 'desc').get()
        const users = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }))
        return NextResponse.json({ users })
    } catch (error) {
        console.error('Error listing users:', error)
        return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }
}

// PATCH - Update user role or approval status
export async function PATCH(request: NextRequest) {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const { uid, role, approved } = await request.json()

        if (!uid) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const userRef = db.collection('admin_users').doc(uid)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const updates: Record<string, any> = {}
        if (role !== undefined) updates.role = role
        if (approved !== undefined) updates.approved = approved

        await userRef.update(updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
}

// DELETE - Remove an admin user
export async function DELETE(request: NextRequest) {
    const adminCheck = await verifyAdmin(request)
    if (!adminCheck) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const { uid } = await request.json()

        if (!uid) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        await db.collection('admin_users').doc(uid).delete()

        // Also delete from Firebase Auth
        try {
            const app = getFirebaseAdminApp()
            const auth = getAuth(app)
            await auth.deleteUser(uid)
        } catch (e) {
            // User might not exist in Auth, that's ok
            console.warn('Could not delete from Firebase Auth:', e)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }
}
