// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
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

    // Batch-fetch all unique related documents at once (eliminates N+1)
    const productIds = new Set<string>()
    const guestIds = new Set<string>()
    const sessionIds = new Set<string>()
    consumptionSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const pid = data.product_id
      if (pid) productIds.add(pid)
      if (data.guest_id) guestIds.add(data.guest_id)
      if (data.session_id) sessionIds.add(data.session_id)
    })

    const productsMap = new Map<string, any>()
    if (productIds.size > 0) {
      for (const chunk of chunkArray(Array.from(productIds), 500)) {
        const productRefs = chunk.map(id => db.collection('products').doc(id))
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
    }

    const guestsMap = new Map<string, any>()
    if (guestIds.size > 0) {
      for (const chunk of chunkArray(Array.from(guestIds), 500)) {
        const guestRefs = chunk.map(id => db.collection('guests').doc(id))
        const guestDocs = await db.getAll(...guestRefs)
        guestDocs.forEach(doc => {
          if (doc.exists) {
            guestsMap.set(doc.id, {
              id: doc.id,
              name: doc.data()?.name,
            })
          }
        })
      }
    }

    const sessionsMap = new Map<string, any>()
    if (sessionIds.size > 0) {
      for (const chunk of chunkArray(Array.from(sessionIds), 500)) {
        const sessionRefs = chunk.map(id => db.collection('sessions').doc(id))
        const sessionDocs = await db.getAll(...sessionRefs)
        sessionDocs.forEach(doc => {
          if (doc.exists) {
            sessionsMap.set(doc.id, {
              id: doc.id,
              name: doc.data()?.name,
            })
          }
        })
      }
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
        unit_price: data.unit_price,
        products: data.product_id ? productsMap.get(data.product_id) || null : null,
        guest: data.guest_id ? guestsMap.get(data.guest_id) || null : null,
        session: data.session_id ? sessionsMap.get(data.session_id) || null : null,
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
