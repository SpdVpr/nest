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

// GET /api/admin/products - Get ALL products (including unavailable)
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    const snapshot = await db.collection('products').get()

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data()?.created_at?.toDate?.()?.toISOString() || doc.data()?.created_at,
      updated_at: doc.data()?.updated_at?.toDate?.()?.toISOString() || doc.data()?.updated_at,
    }))

    // Sort by name
    products.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/admin/products - Create new product
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, price, category, image_url, is_available } = body

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()

    const now = Timestamp.now()
    const productData = {
      name,
      price: parseFloat(price),
      category: category || 'Ostatní',
      image_url: image_url || null,
      is_available: is_available !== undefined ? is_available : true,
      created_at: now,
      updated_at: now,
    }

    const docRef = await db.collection('products').add(productData)
    const newDoc = await docRef.get()

    const product = {
      id: newDoc.id,
      ...newDoc.data(),
      created_at: newDoc.data()?.created_at?.toDate?.()?.toISOString() || newDoc.data()?.created_at,
      updated_at: newDoc.data()?.updated_at?.toDate?.()?.toISOString() || newDoc.data()?.updated_at,
    }

    // Auto-add this product to all existing sessions
    if (productData.is_available) {
      try {
        const sessionsSnapshot = await db.collection('sessions').get()

        const batch = db.batch()
        sessionsSnapshot.docs.forEach(sessionDoc => {
          const stockRef = db.collection('session_stock').doc()
          batch.set(stockRef, {
            session_id: sessionDoc.id,
            product_id: docRef.id,
            initial_quantity: 0,
            consumed_quantity: 0,
            created_at: now,
            updated_at: now,
          })
        })

        await batch.commit()
        console.log(`✅ Product ${product.name} added to ${sessionsSnapshot.size} sessions`)
      } catch (syncError) {
        console.error('Error syncing product to sessions:', syncError)
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}