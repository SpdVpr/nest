// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// PATCH /api/admin/sessions/[id]/deposits - Update guest deposit
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: sessionId } = await context.params
        const { guest_id, deposit } = await request.json()

        if (!guest_id) {
            return NextResponse.json({ error: 'guest_id is required' }, { status: 400 })
        }

        const depositAmount = parseFloat(deposit) || 0

        const db = getFirebaseAdminDb()

        // Verify guest belongs to this session
        const guestDoc = await db.collection('guests').doc(guest_id).get()
        if (!guestDoc.exists || guestDoc.data()?.session_id !== sessionId) {
            return NextResponse.json({ error: 'Guest not found in this session' }, { status: 404 })
        }

        await db.collection('guests').doc(guest_id).update({
            deposit: depositAmount
        })

        return NextResponse.json({ success: true, deposit: depositAmount })
    } catch (error) {
        console.error('Error updating deposit:', error)
        return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 })
    }
}
