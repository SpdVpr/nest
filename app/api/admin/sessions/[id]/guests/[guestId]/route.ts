// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// PATCH /api/admin/sessions/[id]/guests/[guestId] - Admin: update guest fields
// Supports: name, nights_count, check_in_date, check_out_date, room,
// dietary_restrictions, dietary_note. When nights_count changes, hardware
// reservations that were tracking the previous default are recalculated.
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; guestId: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: sessionId, guestId } = await params
        const db = getFirebaseAdminDb()
        const { Timestamp } = await import('firebase-admin/firestore')

        const guestDoc = await db.collection('guests').doc(guestId).get()
        if (!guestDoc.exists) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }

        const guestData = guestDoc.data()
        if (guestData?.session_id !== sessionId) {
            return NextResponse.json({ error: 'Guest does not belong to this event' }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            nights_count,
            check_in_date,
            check_out_date,
            room,
            dietary_restrictions,
            dietary_note,
        } = body

        const updateData: Record<string, any> = {}

        if (typeof name === 'string') {
            const trimmed = name.trim()
            if (!trimmed) {
                return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
            }
            updateData.name = trimmed
        }

        let newNights: number | null = null
        if (nights_count !== undefined) {
            const parsed = parseInt(nights_count)
            if (isNaN(parsed) || parsed < 0) {
                return NextResponse.json({ error: 'Invalid nights_count' }, { status: 400 })
            }
            newNights = parsed
            updateData.nights_count = parsed
        }

        if (check_in_date !== undefined) {
            updateData.check_in_date = check_in_date
                ? Timestamp.fromDate(new Date(check_in_date))
                : null
        }
        if (check_out_date !== undefined) {
            updateData.check_out_date = check_out_date
                ? Timestamp.fromDate(new Date(check_out_date))
                : null
        }
        if (room !== undefined) {
            updateData.room = room || null
        }
        if (dietary_restrictions !== undefined) {
            updateData.dietary_restrictions = Array.isArray(dietary_restrictions)
                ? dietary_restrictions
                : []
        }
        if (dietary_note !== undefined) {
            updateData.dietary_note = dietary_note || null
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
        }

        const oldNights = guestData?.nights_count ?? 1

        const batch = db.batch()
        batch.update(db.collection('guests').doc(guestId), updateData)

        // Sync all active hardware reservations for this guest to the new nights count.
        // Admin's authoritative change to the guest's stay always wins over per-item overrides.
        let hardwareUpdated = 0
        if (newNights !== null && newNights !== oldNights) {
            const hwSnapshot = await db.collection('hardware_reservations')
                .where('guest_id', '==', guestId)
                .where('status', '==', 'active')
                .get()

            await Promise.all(
                hwSnapshot.docs.map(async (resDoc) => {
                    const resData = resDoc.data()
                    if ((resData.nights_count ?? 1) === newNights) return

                    const hwDoc = await db.collection('hardware_items').doc(resData.hardware_item_id).get()
                    if (!hwDoc.exists) return
                    const hwData = hwDoc.data()
                    const pricePerNight = hwData?.price_per_night || 0
                    const quantity = resData.quantity || 1

                    batch.update(resDoc.ref, {
                        nights_count: newNights,
                        total_price: pricePerNight * quantity * newNights,
                    })
                    hardwareUpdated++
                })
            )
        }

        await batch.commit()

        return NextResponse.json({
            success: true,
            hardware_updated: hardwareUpdated,
        })
    } catch (error) {
        console.error('Error updating guest:', error)
        return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
    }
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
