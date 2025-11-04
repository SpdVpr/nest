// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/snacks/guests-with-consumption - Get all guests with their consumption
export async function GET() {
  try {
    const supabase = await createClient()

    // Get active session
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      )
    }

    // Get guests from active session
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('session_id', activeSession.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (guestsError) throw guestsError

    // Get consumption for each guest
    const guestsWithConsumption = await Promise.all(
      (guests || []).map(async (guest) => {
        const { data: consumption } = await supabase
          .from('consumption')
          .select(`
            id,
            quantity,
            products (
              id,
              name,
              price,
              category,
              image_url
            )
          `)
          .eq('guest_id', guest.id)
          .order('consumed_at', { ascending: false })

        // Calculate totals
        const totalItems = consumption?.reduce((sum, item) => sum + item.quantity, 0) || 0
        const totalPrice = consumption?.reduce(
          (sum, item) => sum + (item.products.price * item.quantity),
          0
        ) || 0
        
        // Count beers (assuming products with "pivo" in name or category)
        const totalBeers = consumption?.reduce((sum, item) => {
          const isBeer = 
            item.products.name.toLowerCase().includes('pivo') ||
            item.products.category?.toLowerCase().includes('pivo') ||
            item.products.name.toLowerCase().includes('beer')
          return sum + (isBeer ? item.quantity : 0)
        }, 0) || 0

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