// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/prepared - Get prepared state for a session
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const db = getFirebaseAdminDb()

        const doc = await db.collection('sessions').doc(id).get()
        if (!doc.exists) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const data = doc.data()
        return NextResponse.json({
            hw_prepared: data?.hw_prepared || {},
            games_prepared: data?.games_prepared || {},
        })
    } catch (error) {
        console.error('Error fetching prepared state:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/admin/sessions/[id]/prepared - Toggle prepared state
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const body = await request.json()
        const { guest_id, type, prepared } = body

        if (!guest_id || !type || !['hw', 'games'].includes(type)) {
            return NextResponse.json({ error: 'guest_id and type (hw|games) required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const field = type === 'hw' ? 'hw_prepared' : 'games_prepared'

        if (prepared) {
            await db.collection('sessions').doc(id).update({
                [`${field}.${guest_id}`]: new Date().toISOString(),
            })
        } else {
            await db.collection('sessions').doc(id).update({
                [`${field}.${guest_id}`]: FieldValue.delete(),
            })
        }

        const doc = await db.collection('sessions').doc(id).get()
        const data = doc.data()

        return NextResponse.json({
            hw_prepared: data?.hw_prepared || {},
            games_prepared: data?.games_prepared || {},
        })
    } catch (error) {
        console.error('Error updating prepared state:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
