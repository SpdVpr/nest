// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/consumption - Get consumption records for session
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await context.params
    const db = getFirebaseAdminDb()

    // Get consumption records for this session
    const consumptionSnapshot = await db.collection('consumption')
      .where('session_id', '==', sessionId)
      .get()

    // Fetch product details for each consumption record
    const consumption = await Promise.all(
      consumptionSnapshot.docs.map(async (doc) => {
        const data = doc.data()

        // Fetch product details
        let product = null
        if (data.product_id) {
          const productDoc = await db.collection('products').doc(data.product_id).get()
          if (productDoc.exists) {
            product = {
              name: productDoc.data()?.name,
              price: productDoc.data()?.price,
            }
          }
        }

        return {
          id: doc.id,
          ...data,
          consumed_at: data.consumed_at?.toDate?.()?.toISOString() || data.consumed_at,
          products: product,
        }
      })
    )

    // Sort by consumed_at descending
    consumption.sort((a, b) => {
      const dateA = new Date(a.consumed_at).getTime()
      const dateB = new Date(b.consumed_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({ consumption })
  } catch (error) {
    console.error('Error fetching consumption:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consumption', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}