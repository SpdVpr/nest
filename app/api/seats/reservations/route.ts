import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { SeatReservation } from '@/types/database.types'

// GET /api/seats/reservations?session_id=xxx - Get all seat reservations for a session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    const snapshot = await db.collection('seat_reservations')
      .where('session_id', '==', session_id)
      .get()

    const reservations: SeatReservation[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString(),
    } as SeatReservation))

    // Sort in memory instead of using orderBy (to avoid complex composite index)
    reservations.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateA - dateB
    })

    return NextResponse.json({ reservations })
  } catch (error) {
    console.error('Error in seat reservations GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seats/reservations - Create a new seat reservation
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { seat_id, guest_id, session_id, guest_name } = body

    console.log('Seat reservation POST received:', { seat_id, guest_id, session_id, guest_name })

    // Validation
    if (!seat_id || !guest_id || !session_id || !guest_name) {
      return NextResponse.json({
        error: 'seat_id, guest_id, session_id, and guest_name are required'
      }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')

    // Check if seat is already reserved for this session
    const existingSnapshot = await db.collection('seat_reservations')
      .where('seat_id', '==', seat_id)
      .where('session_id', '==', session_id)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0]
      const reservation = existingDoc.data() as SeatReservation
      return NextResponse.json({
        error: 'Toto místo je již rezervované',
        details: `Místo ${seat_id} je rezervováno pro ${reservation.guest_name}`
      }, { status: 409 })
    }

    // Create the reservation
    const now = Timestamp.now()
    const reservationData = {
      seat_id,
      guest_id,
      session_id,
      guest_name,
      created_at: now,
      updated_at: now,
    }

    const docRef = await db.collection('seat_reservations').add(reservationData)
    const reservation: SeatReservation = {
      id: docRef.id,
      ...reservationData,
      created_at: now.toDate().toISOString(),
      updated_at: now.toDate().toISOString(),
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Error in seat reservations POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

