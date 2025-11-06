import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getActiveSession, getProductById } from '@/lib/firebase/queries'
import { Timestamp } from 'firebase-admin/firestore'
import { Consumption } from '@/types/database.types'

// POST /api/consumption - Add consumption record
export async function POST(request: NextRequest) {
  try {
    const { guest_id, product_id, quantity, session_id } = await request.json()

    if (!guest_id || !product_id) {
      return NextResponse.json(
        { error: 'guest_id and product_id are required' },
        { status: 400 }
      )
    }

    let sessionToUse = session_id

    if (!sessionToUse) {
      const activeSession = await getActiveSession()
      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active session found' },
          { status: 404 }
        )
      }
      sessionToUse = activeSession.id
    }

    const db = getFirebaseAdminDb()
    const consumptionRef = db.collection('consumption')

    const now = Timestamp.now()
    const consumptionData = {
      guest_id,
      product_id,
      quantity: quantity || 1,
      session_id: sessionToUse,
      consumed_at: now,
    }

    const docRef = await consumptionRef.add(consumptionData)
    const consumption: Consumption = {
      id: docRef.id,
      ...consumptionData,
      consumed_at: now.toDate().toISOString(),
    }

    return NextResponse.json({ consumption }, { status: 201 })
  } catch (error) {
    console.error('Error creating consumption:', error)
    return NextResponse.json(
      { error: 'Failed to create consumption record' },
      { status: 500 }
    )
  }
}

// GET /api/consumption?guest_id=xxx - Get consumption for a guest
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const guestId = searchParams.get('guest_id')

    if (!guestId) {
      return NextResponse.json(
        { error: 'guest_id is required' },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()
    const consumptionRef = db.collection('consumption')
    const snapshot = await consumptionRef
      .where('guest_id', '==', guestId)
      .orderBy('consumed_at', 'desc')
      .get()

    // Fetch product details for each consumption
    const consumptionWithProducts = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data()
        const product = await getProductById(data.product_id)

        return {
          id: docSnap.id,
          ...data,
          consumed_at: data.consumed_at?.toDate().toISOString() || new Date().toISOString(),
          products: product ? {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
          } : null,
        }
      })
    )

    return NextResponse.json({ consumption: consumptionWithProducts })
  } catch (error) {
    console.error('Error fetching consumption:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consumption' },
      { status: 500 }
    )
  }
}

// DELETE /api/consumption?id=xxx - Delete a consumption record
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const consumptionId = searchParams.get('id')

    if (!consumptionId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()
    await db.collection('consumption').doc(consumptionId).delete()

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting consumption:', error)
    return NextResponse.json(
      { error: 'Failed to delete consumption record' },
      { status: 500 }
    )
  }
}