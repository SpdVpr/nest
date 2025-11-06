// @ts-nocheck
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(request: Request) {
  try {
    const db = getFirebaseAdminDb()
    const body = await request.json()
    const { guest_id, hardware_item_ids, nights_count, session_id } = body

    console.log('Reservation POST received:', { guest_id, hardware_item_ids, nights_count, session_id })

    // Detailed validation
    if (!guest_id) {
      return NextResponse.json({ error: 'Missing guest_id' }, { status: 400 })
    }
    if (!hardware_item_ids || !Array.isArray(hardware_item_ids)) {
      return NextResponse.json({ error: 'hardware_item_ids must be an array' }, { status: 400 })
    }
    if (hardware_item_ids.length === 0) {
      return NextResponse.json({ error: 'hardware_item_ids cannot be empty' }, { status: 400 })
    }

    // Get session - use provided session_id or find active session
    let activeSessionId: string | null = null

    if (session_id) {
      console.log('Using provided session_id:', session_id)
      // Use provided session_id (from event-specific page)
      const sessionDoc = await db.collection('sessions').doc(session_id).get()

      if (sessionDoc.exists) {
        activeSessionId = sessionDoc.id
        console.log('Found session:', activeSessionId)
      }
    } else {
      console.log('Looking for active session')
      // Find active session (from public page)
      const activeSessionSnapshot = await db.collection('sessions')
        .where('is_active', '==', true)
        .limit(1)
        .get()

      if (!activeSessionSnapshot.empty) {
        activeSessionId = activeSessionSnapshot.docs[0].id
        console.log('Found active session:', activeSessionId)
      }
    }

    if (!activeSessionId) {
      console.error('No session found. session_id was:', session_id)
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Get hardware items to calculate prices
    const itemsSnapshot = await db.collection('hardware_items')
      .where('__name__', 'in', hardware_item_ids)
      .get()

    if (itemsSnapshot.empty) {
      return NextResponse.json({ error: 'Failed to fetch hardware items' }, { status: 500 })
    }

    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Create reservations for each item
    const now = Timestamp.now()
    const reservationPromises = items.map(async (item: any) => {
      const reservationData = {
        hardware_item_id: item.id,
        guest_id,
        session_id: activeSessionId,
        nights_count: nights_count || 1,
        total_price: item.price_per_night * (nights_count || 1),
        status: 'active',
        created_at: now,
        updated_at: now,
      }

      const docRef = await db.collection('hardware_reservations').add(reservationData)
      return {
        id: docRef.id,
        ...reservationData,
        created_at: now.toDate().toISOString(),
        updated_at: now.toDate().toISOString(),
      }
    })

    const reservations = await Promise.all(reservationPromises)

    return NextResponse.json({ reservations })
  } catch (error) {
    console.error('Error in hardware reservations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const db = getFirebaseAdminDb()

    // Check for session_id in query params
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')

    // Get active session
    let activeSessionId: string | null = null

    if (sessionId) {
      // Use provided session_id
      const sessionDoc = await db.collection('sessions').doc(sessionId).get()

      if (sessionDoc.exists) {
        activeSessionId = sessionDoc.id
      }
    } else {
      // Find active session
      const activeSessionSnapshot = await db.collection('sessions')
        .where('is_active', '==', true)
        .limit(1)
        .get()

      if (!activeSessionSnapshot.empty) {
        activeSessionId = activeSessionSnapshot.docs[0].id
      }
    }

    if (!activeSessionId) {
      return NextResponse.json({ reservations: [] })
    }

    const reservationsSnapshot = await db.collection('hardware_reservations')
      .where('session_id', '==', activeSessionId)
      .get()

    // Fetch related data manually
    const reservations = await Promise.all(
      reservationsSnapshot.docs.map(async (doc) => {
        const data = doc.data()

        // Fetch hardware item
        const hardwareDoc = await db.collection('hardware_items').doc(data.hardware_item_id).get()
        const hardwareItem = hardwareDoc.exists ? { id: hardwareDoc.id, ...hardwareDoc.data() } : null

        // Fetch guest
        const guestDoc = await db.collection('guests').doc(data.guest_id).get()
        const guest = guestDoc.exists ? { id: guestDoc.id, name: guestDoc.data().name } : null

        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
          hardware_items: hardwareItem,
          guests: guest,
        }
      })
    )

    // Sort in memory by created_at descending
    reservations.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({ reservations })
  } catch (error) {
    console.error('Error in hardware reservations GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}