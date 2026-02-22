import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { SeatReservation } from '@/types/database.types'

// Table pairs: each seat's partner (same table)
function getPartnerSeat(seatId: string): string | null {
  const row = seatId.charAt(0)
  const num = parseInt(seatId.slice(1))
  // Seats are grouped in pairs: 1+2, 3+4, 5+6, 7+8
  if (num % 2 === 1) {
    return `${row}${num + 1}`
  } else {
    return `${row}${num - 1}`
  }
}

// GET /api/seats/reservations?session_id=xxx
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

    const reservations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      auto_reserved: doc.data().auto_reserved || false,
      created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString(),
    } as SeatReservation & { auto_reserved?: boolean }))

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

// POST /api/seats/reservations
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { seat_id, guest_id, session_id, guest_name } = body

    console.log('Seat reservation POST received:', { seat_id, guest_id, session_id, guest_name })

    if (!seat_id || !guest_id || !session_id || !guest_name) {
      return NextResponse.json({
        error: 'seat_id, guest_id, session_id, and guest_name are required'
      }, { status: 400 })
    }

    const db = getFirebaseAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')

    // Check if seat is already reserved
    const existingSnapshot = await db.collection('seat_reservations')
      .where('seat_id', '==', seat_id)
      .where('session_id', '==', session_id)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0]
      const existingData = existingDoc.data()

      // If auto-reserved by someone else, allow override
      if (existingData.auto_reserved && existingData.guest_id !== guest_id) {
        await db.collection('seat_reservations').doc(existingDoc.id).delete()
        console.log(`Auto-reservation on ${seat_id} overridden by ${guest_name}`)
      } else {
        return NextResponse.json({
          error: 'Toto místo je již rezervované',
          details: `Místo ${seat_id} je rezervováno pro ${existingData.guest_name}`
        }, { status: 409 })
      }
    }

    // Create the reservation
    const now = Timestamp.now()
    const reservationData = {
      seat_id,
      guest_id,
      session_id,
      guest_name,
      auto_reserved: false,
      created_at: now,
      updated_at: now,
    }

    const docRef = await db.collection('seat_reservations').add(reservationData)
    const reservation = {
      id: docRef.id,
      ...reservationData,
      created_at: now.toDate().toISOString(),
      updated_at: now.toDate().toISOString(),
    }

    // Auto-reserve partner seat (same table) if free
    const partnerSeatId = getPartnerSeat(seat_id)
    if (partnerSeatId) {
      const partnerSnapshot = await db.collection('seat_reservations')
        .where('seat_id', '==', partnerSeatId)
        .where('session_id', '==', session_id)
        .limit(1)
        .get()

      if (partnerSnapshot.empty) {
        const partnerData = {
          seat_id: partnerSeatId,
          guest_id,
          session_id,
          guest_name,
          auto_reserved: true,
          created_at: now,
          updated_at: now,
        }
        await db.collection('seat_reservations').add(partnerData)
        console.log(`Auto-reserved partner seat ${partnerSeatId} for ${guest_name}`)
      }
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Error in seat reservations POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
