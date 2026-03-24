import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getSessionBySlug } from '@/lib/firebase/queries'
import { verifyGuestRequest } from '@/lib/verify-guest'

// PATCH /api/event/[slug]/guests/[guestId] - Update guest dates
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; guestId: string }> }
) {
    try {
        const { slug, guestId } = await params
        const db = getFirebaseAdminDb()
        const { Timestamp } = await import('firebase-admin/firestore')

        const session = await getSessionBySlug(slug)
        if (!session) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const guestDoc = await db.collection('guests').doc(guestId).get()
        if (!guestDoc.exists) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }

        const guestData = guestDoc.data()
        if (guestData?.session_id !== session.id) {
            return NextResponse.json({ error: 'Guest does not belong to this event' }, { status: 403 })
        }

        // Authorization: either the guest's linked user, or admin
        let isAuthorized = false
        const adminRole = request.headers.get('x-admin-role')
        if (adminRole === 'super_admin' || adminRole === 'admin') {
            isAuthorized = true
        } else {
            try {
                const authUser = await verifyGuestRequest(request)
                if (authUser && guestData?.user_id === authUser.uid) {
                    isAuthorized = true
                }
            } catch { /* not authenticated */ }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Nemáš oprávnění měnit tento profil' }, { status: 403 })
        }

        const body = await request.json()
        const { check_in_date, check_out_date, nights_count } = body

        const updateData: Record<string, any> = {}

        if (check_in_date) {
            updateData.check_in_date = Timestamp.fromDate(new Date(check_in_date))
        }
        if (check_out_date) {
            updateData.check_out_date = Timestamp.fromDate(new Date(check_out_date))
        }
        if (nights_count !== undefined) {
            updateData.nights_count = parseInt(nights_count)
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
        }

        await db.collection('guests').doc(guestId).update(updateData)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating guest:', error)
        return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 })
    }
}

// DELETE /api/event/[slug]/guests/[guestId] - Unregister guest and release all reservations
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; guestId: string }> }
) {
    try {
        const { slug, guestId } = await params
        const db = getFirebaseAdminDb()

        // Verify session exists
        const session = await getSessionBySlug(slug)
        if (!session) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Verify guest exists and belongs to this session
        const guestDoc = await db.collection('guests').doc(guestId).get()
        if (!guestDoc.exists) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }

        const guestData = guestDoc.data()
        if (guestData?.session_id !== session.id) {
            return NextResponse.json({ error: 'Guest does not belong to this event' }, { status: 403 })
        }

        // Check if event already started
        const now = new Date()
        const startDate = new Date(session.start_date)
        if (now >= startDate) {
            return NextResponse.json(
                { error: 'Nelze se odhlásit po začátku akce' },
                { status: 400 }
            )
        }

        const batch = db.batch()
        let deletedCounts = {
            hardware_reservations: 0,
            seat_reservations: 0,
            game_install_requests: 0,
            consumption: 0,
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

        // 5. Soft-delete the guest (set is_active to false)
        batch.update(db.collection('guests').doc(guestId), { is_active: false })

        await batch.commit()

        return NextResponse.json({
            success: true,
            message: 'Guest unregistered and all reservations released',
            deleted: deletedCounts,
        })
    } catch (error) {
        console.error('Error unregistering guest:', error)
        return NextResponse.json(
            { error: 'Failed to unregister guest' },
            { status: 500 }
        )
    }
}
