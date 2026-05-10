// @ts-nocheck
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

async function isSettlementLocked(db: any, sessionId: string, guestId: string): Promise<boolean> {
  if (!sessionId || !guestId) return false
  const snap = await db.collection('settlements')
    .where('session_id', '==', sessionId)
    .where('guest_id', '==', guestId)
    .limit(1)
    .get()
  if (snap.empty) return false
  const status = snap.docs[0].data().status
  return status === 'pending' || status === 'paid'
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id } = await params
    const body = await request.json()
    const { status, nights_count } = body

    const docRef = db.collection('hardware_reservations').doc(id)
    const currentDoc = await docRef.get()

    if (!currentDoc.exists) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const currentResData = currentDoc.data()
    if (await isSettlementLocked(db, currentResData?.session_id, currentResData?.guest_id)) {
      return NextResponse.json({
        error: 'Vyúčtování již bylo vytvořeno, rezervace už nelze měnit. Kontaktuj admina.',
      }, { status: 403 })
    }

    const updateData: any = {
      updated_at: Timestamp.now(),
    }

    // Update status if provided
    if (status) {
      if (!['active', 'completed', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    // Update nights_count if provided
    if (nights_count !== undefined) {
      if (typeof nights_count !== 'number' || nights_count < 1) {
        return NextResponse.json({ error: 'Invalid nights_count' }, { status: 400 })
      }

      // Get hardware item to recalculate price
      const currentData = currentDoc.data()
      const hardwareDoc = await db.collection('hardware_items').doc(currentData.hardware_item_id).get()

      if (!hardwareDoc.exists) {
        return NextResponse.json({ error: 'Hardware item not found' }, { status: 404 })
      }

      const hardwareData = hardwareDoc.data()
      updateData.nights_count = nights_count
      updateData.total_price = hardwareData.price_per_night * nights_count
    }

    await docRef.update(updateData)

    const updatedDoc = await docRef.get()
    const data = updatedDoc.data()

    return NextResponse.json({
      reservation: {
        id: updatedDoc.id,
        ...data,
        created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
        updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at,
      }
    })
  } catch (error) {
    console.error('Error in reservation PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id } = await params

    // Read reservation data before deleting (to get guest_id and session_id)
    const docSnap = await db.collection('hardware_reservations').doc(id).get()
    const resData = docSnap.exists ? docSnap.data() : null

    if (resData && await isSettlementLocked(db, resData.session_id, resData.guest_id)) {
      return NextResponse.json({
        error: 'Vyúčtování již bylo vytvořeno, rezervace už nelze měnit. Kontaktuj admina.',
      }, { status: 403 })
    }

    await db.collection('hardware_reservations').doc(id).delete()

    // Reset hw_prepared flag for this guest
    if (resData?.session_id && resData?.guest_id) {
      try {
        const { FieldValue } = await import('firebase-admin/firestore')
        await db.collection('sessions').doc(resData.session_id).update({
          [`hw_prepared.${resData.guest_id}`]: FieldValue.delete(),
        })
      } catch (e) {
        console.log('Could not reset hw_prepared flag:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reservation DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}