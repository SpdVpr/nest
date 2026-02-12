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

    await db.collection('seat_reservations').doc(id).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in seat reservation DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

