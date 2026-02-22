import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// DELETE /api/seats/reservations/[id] - Delete a seat reservation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getFirebaseAdminDb()

    // Get the reservation being deleted
    const docSnap = await db.collection('seat_reservations').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const reservation = docSnap.data()!
    const { seat_id, guest_id, session_id } = reservation

    // Delete the main reservation
    await db.collection('seat_reservations').doc(id).delete()

    // If this was a manual reservation (not auto), also remove the partner auto-reservation
    if (!reservation.auto_reserved) {
      // Find partner seat
      const row = seat_id.charAt(0)
      const num = parseInt(seat_id.slice(1))
      const partnerNum = num % 2 === 1 ? num + 1 : num - 1
      const partnerSeatId = `${row}${partnerNum}`

      const partnerSnapshot = await db.collection('seat_reservations')
        .where('seat_id', '==', partnerSeatId)
        .where('session_id', '==', session_id)
        .where('guest_id', '==', guest_id)
        .where('auto_reserved', '==', true)
        .limit(1)
        .get()

      if (!partnerSnapshot.empty) {
        await db.collection('seat_reservations').doc(partnerSnapshot.docs[0].id).delete()
        console.log(`Also removed auto-reservation on partner seat ${partnerSeatId}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in seat reservation DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
