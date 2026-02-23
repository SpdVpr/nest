import { NextRequest } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { AdminRole } from '@/lib/admin-roles'

export interface VerifiedAdmin {
    uid: string
    email: string
    name: string
    role: AdminRole
    isLegacy: boolean
}

/**
 * Verifies an admin request by checking the Authorization header.
 * Supports both:
 * 1. Legacy admin password (ADMIN_PASSWORD env var)
 * 2. Firebase ID tokens (verified against Firebase Auth + admin_users Firestore collection)
 * 
 * Returns the verified admin user info, or null if unauthorized.
 */
export async function verifyAdminRequest(request: NextRequest): Promise<VerifiedAdmin | null> {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.split('Bearer ')[1]

    if (!token) {
        return null
    }

    // 1. Check legacy admin password
    if (token === process.env.ADMIN_PASSWORD) {
        return {
            uid: 'legacy',
            email: 'admin@local',
            name: 'Admin',
            role: 'admin',
            isLegacy: true,
        }
    }

    // 2. Try to verify as Firebase ID token
    try {
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        const decodedToken = await auth.verifyIdToken(token)

        const db = getFirebaseAdminDb()
        const userDoc = await db.collection('admin_users').doc(decodedToken.uid).get()

        if (!userDoc.exists) {
            return null
        }

        const userData = userDoc.data()

        // User must be approved
        if (!userData?.approved) {
            return null
        }

        return {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            name: userData?.name || decodedToken.email || 'Unknown',
            role: (userData?.role as AdminRole) || 'brigadnik',
            isLegacy: false,
        }
    } catch (error) {
        // Token is neither a valid admin password nor a valid Firebase token
        return null
    }
}
