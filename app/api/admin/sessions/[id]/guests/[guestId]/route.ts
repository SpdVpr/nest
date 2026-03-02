// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// DELETE /api/admin/sessions/[id]/guests/[guestId] - Admin: remove guest from event
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; guestId: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: sessionId, guestId } = await params
        const db = getFirebaseAdminDb()

        // Verify guest exists and belongs to this session
        const guestDoc = await db.collection('guests').doc(guestId).get()
        if (!guestDoc.exists) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }

        const guestData = guestDoc.data()
        if (guestData?.session_id !== sessionId) {
            return NextResponse.json({ error: 'Guest does not belong to this event' }, { status: 403 })
        }

        const batch = db.batch()
        const deletedCounts = {
            hardware_reservations: 0,
            seat_reservations: 0,
            game_install_requests: 0,
            consumption: 0,
            menu_selections: 0,
            tips: 0,
        }

        // 1. Delete hardware reservations
        const hwSnapshot = await db.collection('hardware_reservations')
            .where('guest_id', '==', guestId)
            .get()
        hwSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCounts.hardware_reservations++
        })

        // 2. Delete seat reservations
        const seatSnapshot = await db.collection('seat_reservations')
            .where('guest_id', '==', guestId)
            .get()
        seatSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCounts.seat_reservations++
        })

        // 3. Delete game install requests
        const gameInstallSnapshot = await db.collection('game_install_requests')
            .where('guest_id', '==', guestId)
            .get()
        gameInstallSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCounts.game_install_requests++
        })

        // 4. Delete consumption records
        const consumptionSnapshot = await db.collection('consumption')
            .where('guest_id', '==', guestId)
            .get()
        consumptionSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCounts.consumption++
        })

        // 5. Delete menu selections
        const menuSnapshot = await db.collection('menu_selections')
            .where('guest_id', '==', guestId)
            .get()
        menuSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCounts.menu_selections++
        })

        // 6. Delete tips
        const tipsSnapshot = await db.collection('tips')
            .where('guest_id', '==', guestId)
            .get()
        tipsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
            deletedCounts.tips++
        })

        // 7. Soft-delete the guest (set is_active to false)
        batch.update(db.collection('guests').doc(guestId), { is_active: false })

        await batch.commit()

        return NextResponse.json({
            success: true,
            message: `Guest "${guestData?.name}" removed from event`,
            deleted: deletedCounts,
        })
    } catch (error) {
        console.error('Error deleting guest:', error)
        return NextResponse.json(
            { error: 'Failed to delete guest' },
            { status: 500 }
        )
    }
}
