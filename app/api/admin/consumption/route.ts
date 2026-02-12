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

    // Fetch product details for each consumption record
    const records = await Promise.all(
      consumptionSnapshot.docs.map(async (doc) => {
        const data = doc.data()

        // Fetch product details
        let product = null
        if (data.product_id) {
          const productDoc = await db.collection('products').doc(data.product_id).get()
          if (productDoc.exists) {
            product = {
              id: productDoc.id,
              name: productDoc.data()?.name,
              price: productDoc.data()?.price,
              category: productDoc.data()?.category,
            }
          }
        }

        return {
          id: doc.id,
          guest_id: data.guest_id,
          product_id: data.product_id,
          quantity: data.quantity,
          session_id: data.session_id,
          consumed_at: data.consumed_at?.toDate?.()?.toISOString() || data.consumed_at,
          products: product,
        }
      })
    )

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

