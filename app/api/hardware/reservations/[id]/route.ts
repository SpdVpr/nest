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
    const { status, nights_count, quantity } = body

    const docRef = db.collection('hardware_reservations').doc(id)
    const currentDoc = await docRef.get()

    if (!currentDoc.exists) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const currentData = currentDoc.data()
    if (await isSettlementLocked(db, currentData?.session_id, currentData?.guest_id)) {
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

    let newNights: number | null = null
    if (nights_count !== undefined) {
      const parsed = typeof nights_count === 'number' ? nights_count : parseInt(nights_count)
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json({ error: 'Invalid nights_count' }, { status: 400 })
      }
      newNights = parsed
      updateData.nights_count = parsed
    }

    let newQuantity: number | null = null
    if (quantity !== undefined) {
      const parsed = typeof quantity === 'number' ? quantity : parseInt(quantity)
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
      }
      newQuantity = parsed
      updateData.quantity = parsed
    }

    // Recalculate total_price if nights or quantity changed
    if (newNights !== null || newQuantity !== null) {
      const hardwareDoc = await db.collection('hardware_items').doc(currentData.hardware_item_id).get()
      if (!hardwareDoc.exists) {
        return NextResponse.json({ error: 'Hardware item not found' }, { status: 404 })
      }
      const hardwareData = hardwareDoc.data()
      const pricePerNight = hardwareData.price_per_night || 0
      const finalNights = newNights ?? currentData.nights_count ?? 1
      const finalQuantity = newQuantity ?? currentData.quantity ?? 1
      updateData.total_price = pricePerNight * finalNights * finalQuantity
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