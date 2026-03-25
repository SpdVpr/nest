// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id: sessionId } = await params

    // Fetch actual consumption from the consumption collection
    const consumptionSnapshot = await db.collection('consumption')
      .where('session_id', '==', sessionId)
      .get()

    // Build a map of product_id → total consumed quantity
    const consumptionMap: Record<string, number> = {}
    consumptionSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const pid = data.product_id
      if (pid) {
        consumptionMap[pid] = (consumptionMap[pid] || 0) + (data.quantity || 0)
      }
    })

    // Get session stock for this session
    const stockSnapshot = await db.collection('session_stock')
      .where('session_id', '==', sessionId)
      .get()

    // If no stock exists, auto-sync all available products
    if (stockSnapshot.empty) {
      try {
        // Get all available products
        const productsSnapshot = await db.collection('products')
          .where('is_available', '==', true)
          .get()

        // Create stock entries for all products
        const batch = db.batch()
        productsSnapshot.docs.forEach(productDoc => {
          const stockRef = db.collection('session_stock').doc()
          batch.set(stockRef, {
            session_id: sessionId,
            product_id: productDoc.id,
            initial_quantity: 0,
            consumed_quantity: 0,
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
          })
        })
        await batch.commit()

        // Re-fetch the stock
        const refreshedSnapshot = await db.collection('session_stock')
          .where('session_id', '==', sessionId)
          .get()

        const stock = await Promise.all(
          refreshedSnapshot.docs.map(async (doc) => {
            const data = doc.data()
            const productDoc = await db.collection('products').doc(data.product_id).get()
            const productData = productDoc.exists ? productDoc.data() : null
            const realConsumed = consumptionMap[data.product_id] || 0

            return {
              id: doc.id,
              ...data,
              consumed_quantity: realConsumed,
              remaining_quantity: data.initial_quantity - realConsumed,
              created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
              updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
              products: productData ? {
                id: productDoc.id,
                name: productData.name,
                price: productData.price,
                category: productData.category,
                image_url: productData.image_url,
                is_available: productData.is_available,
              } : null,
            }
          })
        )

        // Sort by product name
        stock.sort((a, b) => {
          const nameA = a.products?.name || ''
          const nameB = b.products?.name || ''
          return nameA.localeCompare(nameB)
        })

        return NextResponse.json({ stock })
      } catch (syncError) {
        console.error('Error syncing products:', syncError)
        return NextResponse.json({ stock: [] })
      }
    }

    // Fetch product details for each stock item
    const stock = await Promise.all(
      stockSnapshot.docs.map(async (doc) => {
        const data = doc.data()
        const productDoc = await db.collection('products').doc(data.product_id).get()
        const productData = productDoc.exists ? productDoc.data() : null

        if (!productData) {
          return null
        }

        const realConsumed = consumptionMap[data.product_id] || 0

        // Hide unavailable products only if they have no consumption
        if (!productData.is_available && realConsumed === 0) {
          return null
        }

        return {
          id: doc.id,
          ...data,
          consumed_quantity: realConsumed,
          remaining_quantity: data.initial_quantity - realConsumed,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
          products: {
            id: productDoc.id,
            name: productData.name,
            price: productData.price,
            category: productData.category,
            image_url: productData.image_url,
            is_available: productData.is_available,
          },
        }
      })
    )

    // Filter out null values
    const filteredStock = stock.filter(item => item !== null)

    // Add products that have consumption but no session_stock entry
    const stockProductIds = new Set(filteredStock.map(item => item.product_id))
    const missingProductIds = Object.keys(consumptionMap).filter(pid => !stockProductIds.has(pid))

    if (missingProductIds.length > 0) {
      const missingItems = await Promise.all(
        missingProductIds.map(async (productId) => {
          const productDoc = await db.collection('products').doc(productId).get()
          const productData = productDoc.exists ? productDoc.data() : null
          if (!productData) return null

          return {
            id: `consumption-${productId}`,
            session_id: sessionId,
            product_id: productId,
            initial_quantity: 0,
            consumed_quantity: consumptionMap[productId],
            remaining_quantity: -consumptionMap[productId],
            created_at: null,
            updated_at: null,
            products: {
              id: productDoc.id,
              name: productData.name,
              price: productData.price,
              category: productData.category,
              image_url: productData.image_url,
              is_available: productData.is_available,
            },
          }
        })
      )
      filteredStock.push(...missingItems.filter(item => item !== null))
    }

    // Sort by product name
    filteredStock.sort((a, b) => {
      const nameA = a.products?.name || ''
      const nameB = b.products?.name || ''
      return nameA.localeCompare(nameB)
    })

    return NextResponse.json({ stock: filteredStock })
  } catch (error) {
    console.error('Error fetching session stock:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id: sessionId } = await params
    const { product_id, initial_quantity } = await request.json()

    if (!product_id || initial_quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if stock entry already exists
    const existingSnapshot = await db.collection('session_stock')
      .where('session_id', '==', sessionId)
      .where('product_id', '==', product_id)
      .limit(1)
      .get()

    const now = Timestamp.now()
    const stockData = {
      session_id: sessionId,
      product_id,
      initial_quantity: Math.max(0, initial_quantity),
      updated_at: now,
    }

    let docRef
    if (!existingSnapshot.empty) {
      // Update existing
      docRef = existingSnapshot.docs[0].ref
      await docRef.update(stockData)
    } else {
      // Create new
      docRef = db.collection('session_stock').doc()
      await docRef.set({
        ...stockData,
        consumed_quantity: 0,
        created_at: now,
      })
    }

    const updatedDoc = await docRef.get()
    const data = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      created_at: updatedDoc.data()?.created_at?.toDate?.()?.toISOString() || updatedDoc.data()?.created_at,
      updated_at: updatedDoc.data()?.updated_at?.toDate?.()?.toISOString() || updatedDoc.data()?.updated_at,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating session stock:', error)
    return NextResponse.json(
      { error: 'Failed to update stock' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id: sessionId } = await params
    const { product_id } = await request.json()

    if (!product_id) {
      return NextResponse.json(
        { error: 'Missing product_id' },
        { status: 400 }
      )
    }

    // Find and delete the stock entry
    const snapshot = await db.collection('session_stock')
      .where('session_id', '==', sessionId)
      .where('product_id', '==', product_id)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session stock:', error)
    return NextResponse.json(
      { error: 'Failed to delete stock' },
      { status: 500 }
    )
  }
}
