import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getSessionBySlug, getProductById } from '@/lib/firebase/queries'
import { Guest, Consumption, Product } from '@/types/database.types'

// GET /api/event/[slug]/guests - Get guests for specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const db = getFirebaseAdminDb()

    // First get the session
    const session = await getSessionBySlug(slug)
    if (!session) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get guests for this session
    const guestsSnapshot = await db.collection('guests')
      .where('session_id', '==', session.id)
      .where('is_active', '==', true)
      .get()

    // Get consumption for each guest
    const guestsWithTotals = await Promise.all(
      guestsSnapshot.docs.map(async (guestDoc) => {
        const guestData = guestDoc.data()
        const guest: Guest = {
          id: guestDoc.id,
          ...guestData,
          created_at: guestData.created_at?.toDate().toISOString() || new Date().toISOString(),
          check_in_date: guestData.check_in_date?.toDate().toISOString() || null,
          check_out_date: guestData.check_out_date?.toDate().toISOString() || null,
        } as Guest

        // Get consumption for this guest
        const consumptionSnapshot = await db.collection('consumption')
          .where('guest_id', '==', guestDoc.id)
          .get()

        const consumption = await Promise.all(
          consumptionSnapshot.docs.map(async (consDoc) => {
            const consData = consDoc.data()
            const product = await getProductById(consData.product_id)
            return {
              id: consDoc.id,
              quantity: consData.quantity || 0,
              consumed_at: consData.consumed_at?.toDate().toISOString() || new Date().toISOString(),
              products: product,
            }
          })
        )

        // Calculate totals
        const totalBeers = consumption
          .filter(c => c.products?.category?.toLowerCase().includes('pivo'))
          .reduce((sum, c) => sum + (c.quantity || 0), 0)

        // totalItems = all items EXCEPT beers (only food and snacks)
        const totalItems = consumption
          .filter(c => !c.products?.category?.toLowerCase().includes('pivo'))
          .reduce((sum, c) => sum + (c.quantity || 0), 0)

        const totalPrice = consumption.reduce(
          (sum, c) => sum + ((c.quantity || 0) * (c.products?.price || 0)),
          0
        )

        return {
          ...guest,
          totalItems,
          totalPrice,
          totalBeers,
          consumption,
        }
      })
    )

    // Sort by name
    guestsWithTotals.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      guests: guestsWithTotals,
      session_id: session.id
    })
  } catch (error) {
    console.error('Error fetching event guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

// POST /api/event/[slug]/guests - Register new guest for event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { name, nights_count = 1, check_in_date, check_out_date } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'Check-in and check-out dates are required' },
        { status: 400 }
      )
    }

    const nightsNum = parseInt(nights_count)
    if (isNaN(nightsNum) || nightsNum < 1) {
      return NextResponse.json(
        { error: 'nights_count must be a positive number' },
        { status: 400 }
      )
    }

    // Get the session
    const session = await getSessionBySlug(slug)
    if (!session) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const db = getFirebaseAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')

    // Check if guest with same name already exists in this session
    const existingGuestSnapshot = await db.collection('guests')
      .where('session_id', '==', session.id)
      .where('name', '==', name.trim())
      .where('is_active', '==', true)
      .limit(1)
      .get()

    if (!existingGuestSnapshot.empty) {
      return NextResponse.json(
        { error: 'Host s tímto jménem už je zaregistrovaný' },
        { status: 409 }
      )
    }

    // Create guest
    const guestData = {
      name: name.trim(),
      session_id: session.id,
      nights_count: nightsNum,
      check_in_date: check_in_date ? Timestamp.fromDate(new Date(check_in_date)) : null,
      check_out_date: check_out_date ? Timestamp.fromDate(new Date(check_out_date)) : null,
      is_active: true,
      created_at: Timestamp.now(),
    }

    const docRef = await db.collection('guests').add(guestData)
    const guest: Guest = {
      id: docRef.id,
      ...guestData,
      created_at: guestData.created_at.toDate().toISOString(),
      check_in_date: guestData.check_in_date?.toDate().toISOString() || null,
      check_out_date: guestData.check_out_date?.toDate().toISOString() || null,
    }

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Error creating guest:', error)
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json(
      { error: `Failed to create guest: ${errorMessage}` },
      { status: 500 }
    )
  }
}