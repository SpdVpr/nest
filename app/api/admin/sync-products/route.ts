// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    // Get all available products
    const productsSnapshot = await db.collection('products')
      .where('is_available', '==', true)
      .get()

    // Get all sessions
    const sessionsSnapshot = await db.collection('sessions').get()

    let syncedCount = 0
    const now = Timestamp.now()

    // For each session, add missing products to session_stock
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionId = sessionDoc.id

      // Get existing stock for this session
      const existingStockSnapshot = await db.collection('session_stock')
        .where('session_id', '==', sessionId)
        .get()

      const existingProductIds = new Set(
        existingStockSnapshot.docs.map(doc => doc.data().product_id)
      )

      // Add missing products
      const batch = db.batch()
      for (const productDoc of productsSnapshot.docs) {
        if (!existingProductIds.has(productDoc.id)) {
          const stockRef = db.collection('session_stock').doc()
          batch.set(stockRef, {
            session_id: sessionId,
            product_id: productDoc.id,
            initial_quantity: 0,
            consumed_quantity: 0,
            created_at: now,
            updated_at: now,
          })
          syncedCount++
        }
      }

      if (syncedCount > 0) {
        await batch.commit()
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Produkty byly synchronizovány ke všem eventům',
      synced_count: syncedCount
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Error syncing products:', error)
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to sync products', details: errorMessage },
      { status: 500 }
    )
  }
}
