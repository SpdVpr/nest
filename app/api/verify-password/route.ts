import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// POST /api/verify-password - Verify event access password and return slug
export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json()

        if (!password || !password.trim()) {
            return NextResponse.json(
                { error: 'Heslo je povinné' },
                { status: 400 }
            )
        }

        const db = getFirebaseAdminDb()
        const passwordTrimmed = password.trim().toLowerCase()

        const snapshot = await db.collection('sessions')
            .where('access_password', '==', passwordTrimmed)
            .limit(1)
            .get()

        if (snapshot.empty) {
            return NextResponse.json(
                { error: 'Neplatné heslo. Zkontroluj ho a zkus to znovu.' },
                { status: 404 }
            )
        }

        const sessionDoc = snapshot.docs[0]
        const sessionData = sessionDoc.data()

        return NextResponse.json({
            success: true,
            slug: sessionData.slug,
            name: sessionData.name,
        })
    } catch (error) {
        console.error('Error verifying password:', error)
        return NextResponse.json(
            { error: 'Chyba při ověřování hesla' },
            { status: 500 }
        )
    }
}
