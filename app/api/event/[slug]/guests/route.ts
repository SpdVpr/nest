import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getSessionBySlug } from '@/lib/firebase/queries'
import { Guest } from '@/types/database.types'
import { verifyGuestRequest } from '@/lib/verify-guest'

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

    // Get guests and ALL consumption for this session in parallel
    const [guestsSnapshot, consumptionSnapshot] = await Promise.all([
      db.collection('guests')
        .where('session_id', '==', session.id)
        .where('is_active', '==', true)
        .get(),
      db.collection('consumption')
        .where('session_id', '==', session.id)
        .get(),
    ])

    // Batch-fetch all unique products at once (eliminates N+1 in N+1)
    const productIds = new Set<string>()
    consumptionSnapshot.docs.forEach(doc => {
      const pid = doc.data().product_id
      if (pid) productIds.add(pid)
    })

    const productsMap = new Map<string, any>()
    if (productIds.size > 0) {
      const productRefs = Array.from(productIds).map(id => db.collection('products').doc(id))
      const productDocs = await db.getAll(...productRefs)
      productDocs.forEach(doc => {
        if (doc.exists) {
          productsMap.set(doc.id, {
            id: doc.id,
            name: doc.data()?.name,
            price: doc.data()?.price,
            category: doc.data()?.category,
          })
        }
      })
    }

    // Group consumption by guest_id for O(1) lookup
    const consumptionByGuest = new Map<string, any[]>()
    consumptionSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const guestId = data.guest_id
      if (!consumptionByGuest.has(guestId)) {
        consumptionByGuest.set(guestId, [])
      }
      consumptionByGuest.get(guestId)!.push({
        id: doc.id,
        quantity: data.quantity || 0,
        consumed_at: data.consumed_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        products: data.product_id ? productsMap.get(data.product_id) || null : null,
      })
    })

    // Map guests with pre-computed consumption data
    const guestsWithTotals = guestsSnapshot.docs.map(guestDoc => {
      const guestData = guestDoc.data()
      const guest: Guest = {
        id: guestDoc.id,
        ...guestData,
        created_at: guestData.created_at?.toDate().toISOString() || new Date().toISOString(),
        check_in_date: guestData.check_in_date?.toDate().toISOString() || null,
        check_out_date: guestData.check_out_date?.toDate().toISOString() || null,
      } as Guest

      const consumption = consumptionByGuest.get(guestDoc.id) || []

      // Calculate totals
      const totalBeers = consumption
        .filter((c: any) => c.products?.category?.toLowerCase().includes('pivo'))
        .reduce((sum: number, c: any) => sum + (c.quantity || 0), 0)

      const totalItems = consumption
        .filter((c: any) => !c.products?.category?.toLowerCase().includes('pivo'))
        .reduce((sum: number, c: any) => sum + (c.quantity || 0), 0)

      const totalPrice = consumption.reduce(
        (sum: number, c: any) => sum + ((c.quantity || 0) * (c.products?.price || 0)),
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

    // If authenticated, auto-link the guest to the user
    let userId: string | null = null
    try {
      const authUser = await verifyGuestRequest(request)
      if (authUser) {
        userId = authUser.uid
      }
    } catch {
      // Not authenticated — that's fine, continue without user_id
    }

    // Create guest
    const guestData: Record<string, any> = {
      name: name.trim(),
      session_id: session.id,
      nights_count: nightsNum,
      check_in_date: check_in_date ? Timestamp.fromDate(new Date(check_in_date)) : null,
      check_out_date: check_out_date ? Timestamp.fromDate(new Date(check_out_date)) : null,
      is_active: true,
      created_at: Timestamp.now(),
    }

    if (userId) {
      guestData.user_id = userId
    }

    const docRef = await db.collection('guests').add(guestData)
    const guest = {
      id: docRef.id,
      name: guestData.name,
      session_id: guestData.session_id,
      nights_count: guestData.nights_count,
      is_active: guestData.is_active,
      user_id: guestData.user_id || null,
      created_at: guestData.created_at.toDate().toISOString(),
      check_in_date: guestData.check_in_date?.toDate().toISOString() || null,
      check_out_date: guestData.check_out_date?.toDate().toISOString() || null,
    } as Guest

    // Trigger notifications for other registered users on this event
    try {
      const otherGuestsSnap = await db.collection('guests')
        .where('session_id', '==', session.id)
        .where('is_active', '==', true)
        .get()

      const notifyUserIds = new Set<string>()
      otherGuestsSnap.docs.forEach(doc => {
        const uid = doc.data().user_id
        if (uid && uid !== userId) notifyUserIds.add(uid)
      })

      if (notifyUserIds.size > 0) {
        const notifBatch = db.batch()
        const now = Timestamp.now()
        notifyUserIds.forEach(uid => {
          const ref = db.collection('notifications').doc()
          notifBatch.set(ref, {
            user_id: uid,
            type: 'new_registration',
            title: 'Nová registrace',
            body: `${name.trim()} se zaregistroval/a na ${session.name}`,
            session_id: session.id,
            is_read: false,
            created_at: now,
          })
        })
        await notifBatch.commit()
      }
    } catch (notifError) {
      // Don't fail the registration if notifications fail
      console.error('Failed to send notifications:', notifError)
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