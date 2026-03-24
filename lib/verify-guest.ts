import { NextRequest } from 'next/server'
import { getFirebaseAdminApp } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

export interface VerifiedGuest {
    uid: string
    email: string
}

/**
 * Optionally verifies a guest request by checking for a Firebase ID token.
 * - If Authorization header present and valid → returns { uid, email }
 * - If no Authorization header → returns null (legacy/anonymous mode)
 * - If Authorization header present but invalid → throws (caller should return 401)
 */
export async function verifyGuestRequest(request: NextRequest): Promise<VerifiedGuest | null> {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.split('Bearer ')[1]

    if (!token) {
        return null
    }

    const app = getFirebaseAdminApp()
    const auth = getAuth(app)
    const decodedToken = await auth.verifyIdToken(token)

    return {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
    }
}
