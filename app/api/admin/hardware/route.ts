// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

// Verify admin authentication
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/hardware - Get ALL hardware items
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    const snapshot = await db.collection('hardware_items').get()

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      quantity: doc.data()?.quantity || 1,
      created_at: doc.data()?.created_at?.toDate?.()?.toISOString() || doc.data()?.created_at,
    }))

    // Sort by sort_order first, then category, then name
    items.sort((a, b) => {
      const orderA = a.sort_order ?? 999
      const orderB = b.sort_order ?? 999
      if (orderA !== orderB) return orderA - orderB
      const categoryCompare = (a.category || '').localeCompare(b.category || '')
      if (categoryCompare !== 0) return categoryCompare
      return (a.name || '').localeCompare(b.name || '')
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching hardware items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hardware items' },
      { status: 500 }
    )
  }
}

// POST /api/admin/hardware - Create new hardware item
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, category, price_per_night, is_available, description, quantity, specs } = body

    if (!name || !type || !category || price_per_night === undefined) {
      return NextResponse.json(
        { error: 'Name, type, category and price_per_night are required' },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()

    const itemData = {
      name,
      type,
      category,
      price_per_night: parseFloat(price_per_night),
      quantity: parseInt(quantity) || 1,
      is_available: is_available !== undefined ? is_available : true,
      description: description || null,
      specs: specs || null,
      sort_order: body.sort_order ?? 0,
      created_at: Timestamp.now(),
    }

    const docRef = await db.collection('hardware_items').add(itemData)
    const newDoc = await docRef.get()

    const item = {
      id: newDoc.id,
      ...newDoc.data(),
      created_at: newDoc.data()?.created_at?.toDate?.()?.toISOString() || newDoc.data()?.created_at,
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error creating hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to create hardware item' },
      { status: 500 }
    )
  }
}