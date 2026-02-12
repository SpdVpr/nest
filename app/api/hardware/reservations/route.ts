// @ts-nocheck
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(request: Request) {
  try {
    const db = getFirebaseAdminDb()
    const body = await request.json()
    const { guest_id, hardware_item_ids, nights_count, session_id, reservations: reservationItems } = body

    console.log('Reservation POST received:', { guest_id, hardware_item_ids, nights_count, session_id, reservationItems })

    // Detailed validation
    if (!guest_id) {
      return NextResponse.json({ error: 'Missing guest_id' }, { status: 400 })
    }

    // Support both old format (hardware_item_ids) and new format (reservationItems with quantity)
    const itemsToReserve: { hardware_item_id: string, quantity: number }[] = []

    if (reservationItems && Array.isArray(reservationItems)) {
      // New format: [{hardware_item_id, quantity}]
      itemsToReserve.push(...reservationItems)
    } else if (hardware_item_ids && Array.isArray(hardware_item_ids)) {
      // Old format: just IDs (1 qty each) - backwards compatible
      // Count occurrences of each ID
      const countMap = new Map<string, number>()
      for (const id of hardware_item_ids) {
        countMap.set(id, (countMap.get(id) || 0) + 1)
      }
      for (const [id, qty] of countMap) {
        itemsToReserve.push({ hardware_item_id: id, quantity: qty })
      }
    } else {
      return NextResponse.json({ error: 'hardware_item_ids or reservations must be provided' }, { status: 400 })
    }

    if (itemsToReserve.length === 0) {
      return NextResponse.json({ error: 'No items to reserve' }, { status: 400 })
    }

    // Get session
    let activeSessionId: string | null = null

    if (session_id) {
      const sessionDoc = await db.collection('sessions').doc(session_id).get()
      if (sessionDoc.exists) {
        activeSessionId = sessionDoc.id
      }
    } else {
      const activeSessionSnapshot = await db.collection('sessions')
        .where('is_active', '==', true)
        .limit(1)
        .get()

      if (!activeSessionSnapshot.empty) {
        activeSessionId = activeSessionSnapshot.docs[0].id
      }
    }

    if (!activeSessionId) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Check availability for each item
    for (const item of itemsToReserve) {
      const itemDoc = await db.collection('hardware_items').doc(item.hardware_item_id).get()
      if (!itemDoc.exists) {
        return NextResponse.json({ error: `Hardware item ${item.hardware_item_id} not found` }, { status: 404 })
      }

      const itemData = itemDoc.data()
      const totalStock = itemData.quantity || 1

      // Count existing active reservations for this item in this session
      const existingRes = await db.collection('hardware_reservations')
        .where('session_id', '==', activeSessionId)
        .where('hardware_item_id', '==', item.hardware_item_id)
        .where('status', '==', 'active')
        .get()

      const reservedQty = existingRes.docs.reduce((sum, doc) => sum + (doc.data().quantity || 1), 0)
      const available = totalStock - reservedQty

      if (item.quantity > available) {
        return NextResponse.json({
          error: `Nedostatek kusů: ${itemData.name} (volných: ${available}, požadováno: ${item.quantity})`,
        }, { status: 400 })
      }
    }

    // Create reservations
    const now = Timestamp.now()
    const createdReservations = []

    for (const item of itemsToReserve) {
      const itemDoc = await db.collection('hardware_items').doc(item.hardware_item_id).get()
      const itemData = itemDoc.data()

      const reservationData = {
        hardware_item_id: item.hardware_item_id,
        guest_id,
        session_id: activeSessionId,
        quantity: item.quantity,
        nights_count: nights_count || 1,
        total_price: (itemData.price_per_night || 0) * item.quantity * (nights_count || 1),
        status: 'active',
        created_at: now,
        updated_at: now,
      }

      const docRef = await db.collection('hardware_reservations').add(reservationData)
      createdReservations.push({
        id: docRef.id,
        ...reservationData,
        created_at: now.toDate().toISOString(),
        updated_at: now.toDate().toISOString(),
      })
    }

    return NextResponse.json({ reservations: createdReservations })
  } catch (error) {
    console.error('Error in hardware reservations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const db = getFirebaseAdminDb()

    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')

    let activeSessionId: string | null = null

    if (sessionId) {
      const sessionDoc = await db.collection('sessions').doc(sessionId).get()
      if (sessionDoc.exists) {
        activeSessionId = sessionDoc.id
      }
    } else {
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
          quantity: data.quantity || 1,
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