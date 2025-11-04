// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guestId } = await params
    const supabase = await createClient()

    // Fetch guest with session info
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select(`
        id,
        name,
        session_id,
        created_at,
        nights_count,
        check_in_date,
        check_out_date,
        is_active,
        session:sessions (
          id,
          name,
          start_date,
          end_date
        )
      `)
      .eq('id', guestId)
      .single()

    if (guestError || !guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    // Add price_per_night manually (default to 0 if not available)
    if (guest && (guest as any).session) {
      (guest as any).session.price_per_night = 0
    }

    // Fetch consumption with products
    const { data: consumption, error: consumptionError } = await supabase
      .from('consumption')
      .select(`
        id,
        quantity,
        consumed_at,
        product:products (
          id,
          name,
          price,
          category,
          image_url
        )
      `)
      .eq('guest_id', guestId)
      .order('consumed_at', { ascending: false })

    if (consumptionError) {
      console.error('Error fetching consumption:', consumptionError)
      return NextResponse.json(
        { error: 'Failed to fetch consumption' },
        { status: 500 }
      )
    }

    // Fetch hardware reservations
    const { data: hardwareReservations, error: hardwareError } = await supabase
      .from('hardware_reservations')
      .select(`
        id,
        hardware_item_id,
        nights_count,
        total_price,
        status,
        notes,
        created_at,
        hardware_item:hardware_items (
          id,
          name,
          type,
          category,
          price_per_night,
          specs
        )
      `)
      .eq('guest_id', guestId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (hardwareError) {
      console.error('Error fetching hardware:', hardwareError)
    }

    // Calculate statistics
    let totalItems = 0
    let totalBeers = 0
    let totalPrice = 0
    const categoryMap = new Map<string, { count: number; total: number }>()

    consumption?.forEach((item: any) => {
      const quantity = item.quantity || 1
      const price = item.product.price || 0
      const category = item.product.category || 'Ostatní'
      const productName = (item.product.name || '').toLowerCase()

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
    const accommodationCost = ((guest as any).nights_count || 1) * ((guest as any).session?.price_per_night || 0)

    // Calculate hardware cost
    const hardwareCost = ((hardwareReservations as any) || []).reduce((sum: number, hw: any) => sum + (hw.total_price || 0), 0)

    return NextResponse.json({
      guest: {
        ...(guest as any),
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