// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guestId } = await params
    const db = getFirebaseAdminDb()

    // Fetch guest
    const guestDoc = await db.collection('guests').doc(guestId).get()

    if (!guestDoc.exists) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    const guestData = guestDoc.data()
    const guest: any = {
      id: guestDoc.id,
      name: guestData?.name,
      session_id: guestData?.session_id,
      created_at: guestData?.created_at?.toDate?.()?.toISOString(),
      nights_count: guestData?.nights_count || 1,
      check_in_date: guestData?.check_in_date?.toDate?.()?.toISOString() || null,
      check_out_date: guestData?.check_out_date?.toDate?.()?.toISOString() || null,
      is_active: guestData?.is_active ?? true,
    }

    // Fetch session info
    if (guest.session_id) {
      const sessionDoc = await db.collection('sessions').doc(guest.session_id).get()
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data()
        guest.session = {
          id: sessionDoc.id,
          name: sessionData?.name,
          start_date: sessionData?.start_date?.toDate?.()?.toISOString(),
          end_date: sessionData?.end_date?.toDate?.()?.toISOString(),
          price_per_night: sessionData?.price_per_night || 0,
        }
      }
    }

    // Fetch consumption with products
    const consumptionSnapshot = await db.collection('consumption')
      .where('guest_id', '==', guestId)
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
          consumed_at: data.consumed_at?.toDate?.()?.toISOString(),
          product: product,
        }
      })
    )

    // Sort by consumed_at descending
    consumption.sort((a, b) => {
      const dateA = new Date(a.consumed_at || 0).getTime()
      const dateB = new Date(b.consumed_at || 0).getTime()
      return dateB - dateA
    })

    // Fetch hardware reservations
    const hardwareSnapshot = await db.collection('hardware_reservations')
      .where('guest_id', '==', guestId)
      .where('status', '==', 'active')
      .get()

    const hardwareReservations = await Promise.all(
      hardwareSnapshot.docs.map(async (doc) => {
        const data = doc.data()

        // Fetch hardware item details
        let hardwareItem = null
        if (data.hardware_item_id) {
          const itemDoc = await db.collection('hardware_items').doc(data.hardware_item_id).get()
          if (itemDoc.exists) {
            const itemData = itemDoc.data()
            hardwareItem = {
              id: itemDoc.id,
              name: itemData?.name,
              type: itemData?.type,
              category: itemData?.category,
              price_per_night: itemData?.price_per_night,
              specs: itemData?.specs,
            }
          }
        }

        return {
          id: doc.id,
          hardware_item_id: data.hardware_item_id,
          nights_count: data.nights_count,
          total_price: data.total_price,
          status: data.status,
          notes: data.notes,
          created_at: data.created_at?.toDate?.()?.toISOString(),
          hardware_item: hardwareItem,
        }
      })
    )

    // Sort by created_at descending
    hardwareReservations.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA
    })

    // Calculate statistics
    let totalItems = 0
    let totalBeers = 0
    let totalPrice = 0
    const categoryMap = new Map<string, { count: number; total: number }>()

    consumption?.forEach((item: any) => {
      const quantity = item.quantity || 1
      const price = item.product?.price || 0
      const category = item.product?.category || 'Ostatní'
      const productName = (item.product?.name || '').toLowerCase()

      totalItems += quantity
      totalPrice += price * quantity

      // Check if it's beer
      if (
        productName.includes('pivo') ||
        productName.includes('beer') ||
        (category && (category.toLowerCase().includes('pivo') || category.toLowerCase().includes('beer')))
      ) {
        totalBeers += quantity
      }

      // Category breakdown
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, total: 0 })
      }
      const catData = categoryMap.get(category)!
      catData.count += quantity
      catData.total += price * quantity
    })

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total)

    // Calculate accommodation cost
    const accommodationCost = (guest.nights_count || 1) * (guest.session?.price_per_night || 0)

    // Calculate hardware cost
    const hardwareCost = hardwareReservations.reduce((sum: number, hw: any) => sum + (hw.total_price || 0), 0)

    return NextResponse.json({
      guest: {
        ...guest,
        totalItems,
        totalBeers,
        totalPrice,
        consumption: consumption || [],
        categoryBreakdown,
        hardwareReservations: hardwareReservations || [],
        accommodationCost,
        hardwareCost,
      },
    })
  } catch (error) {
    console.error('Error fetching guest detail:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}