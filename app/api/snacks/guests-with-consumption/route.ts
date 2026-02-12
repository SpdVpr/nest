// @ts-nocheck
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// GET /api/snacks/guests-with-consumption - Get all guests with their consumption
export async function GET() {
  try {
    const db = getFirebaseAdminDb()

    // Get active session
    const sessionsSnapshot = await db.collection('sessions')
      .where('is_active', '==', true)
      .limit(1)
      .get()

    if (sessionsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      )
    }

    const activeSessionId = sessionsSnapshot.docs[0].id

    // Get guests from active session
    const guestsSnapshot = await db.collection('guests')
      .where('session_id', '==', activeSessionId)
      .where('is_active', '==', true)
      .get()

    // Get consumption for each guest
    const guestsWithConsumption = await Promise.all(
      guestsSnapshot.docs.map(async (guestDoc) => {
        const guestData = guestDoc.data()
        const guest = {
          id: guestDoc.id,
          name: guestData.name,
          session_id: guestData.session_id,
          nights_count: guestData.nights_count,
          is_active: guestData.is_active,
          created_at: guestData.created_at?.toDate?.()?.toISOString(),
          check_in_date: guestData.check_in_date?.toDate?.()?.toISOString() || null,
          check_out_date: guestData.check_out_date?.toDate?.()?.toISOString() || null,
        }

        // Get consumption for this guest
        const consumptionSnapshot = await db.collection('consumption')
          .where('guest_id', '==', guestDoc.id)
          .get()

        const consumption = await Promise.all(
          consumptionSnapshot.docs.map(async (doc) => {
            const data = doc.data()

            // Fetch product details
            let product = null
            if (data.product_id) {
              const productDoc = await db.collection('products').doc(data.product_id).get()
              if (productDoc.exists) {
                const productData = productDoc.data()
                product = {
                  id: productDoc.id,
                  name: productData?.name,
                  price: productData?.price,
                  category: productData?.category,
                  image_url: productData?.image_url,
                }
              }
            }

            return {
              id: doc.id,
              quantity: data.quantity,
              products: product,
            }
          })
        )

        // Sort by consumed_at descending
        consumption.sort((a, b) => {
          const dateA = new Date(a.consumed_at || 0).getTime()
          const dateB = new Date(b.consumed_at || 0).getTime()
          return dateB - dateA
        })

        // Calculate totals
        const totalItems = consumption.reduce((sum, item) => sum + (item.quantity || 0), 0)
        const totalPrice = consumption.reduce(
          (sum, item) => sum + ((item.products?.price || 0) * (item.quantity || 0)),
          0
        )

        // Count beers (assuming products with "pivo" in name or category)
        const totalBeers = consumption.reduce((sum, item) => {
          const productName = (item.products?.name || '').toLowerCase()
          const category = (item.products?.category || '').toLowerCase()
          const isBeer =
            productName.includes('pivo') ||
            category.includes('pivo') ||
            productName.includes('beer')
          return sum + (isBeer ? (item.quantity || 0) : 0)
        }, 0)

        return {
          ...guest,
          consumption: consumption || [],
          totalItems,
          totalBeers,
          totalPrice,
        }
      })
    )

    // Sort by total items (most active first)
    guestsWithConsumption.sort((a, b) => b.totalItems - a.totalItems)

    return NextResponse.json({ guests: guestsWithConsumption })
  } catch (error) {
    console.error('Error fetching guests with consumption:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}