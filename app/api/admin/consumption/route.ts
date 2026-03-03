// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/consumption - Get all consumption records
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    // Get all consumption records
    const consumptionSnapshot = await db.collection('consumption').get()

    // Batch-fetch all unique products at once (eliminates N+1)
    const productIds = new Set<string>()
    consumptionSnapshot.docs.forEach(doc => {
      const pid = doc.data().product_id
      if (pid) productIds.add(pid)
    })

    const productsMap = new Map<string, any>()
    if (productIds.size > 0) {
      // Firestore getAll supports up to 500 docs per batch
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

    // Map records with product lookups from cache
    const records = consumptionSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        guest_id: data.guest_id,
        product_id: data.product_id,
        quantity: data.quantity,
        session_id: data.session_id,
        consumed_at: data.consumed_at?.toDate?.()?.toISOString() || data.consumed_at,
        products: data.product_id ? productsMap.get(data.product_id) || null : null,
      }
    })

    // Sort by consumed_at descending
    records.sort((a, b) => {
      const dateA = new Date(a.consumed_at).getTime()
      const dateB = new Date(b.consumed_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Error fetching consumption:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consumption records' },
      { status: 500 }
    )
  }
}

