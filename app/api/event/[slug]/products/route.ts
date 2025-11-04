// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/event/[slug]/products - Get products with stock for specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params

    // First get the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('slug', slug)
      .single()

    if (sessionError) throw sessionError

    // Get products with their stock information for this session
    const { data: stockData, error: stockError } = await supabase
      .from('session_stock')
      .select(`
        *,
        products (*)
      `)
      .eq('session_id', session.id)

    if (stockError) throw stockError

    // Transform data to include stock info with products
    const productsWithStock = stockData.map(stock => ({
      ...stock.products,
      stock: {
        initial_quantity: stock.initial_quantity,
        consumed_quantity: stock.consumed_quantity,
        remaining_quantity: stock.remaining_quantity,
      }
    }))

    // Filter only products that are available (no stock limit)
    const availableProducts = productsWithStock.filter(
      p => p.is_available
    )

    return NextResponse.json({ 
      products: availableProducts,
      session_id: session.id 
    })
  } catch (error) {
    console.error('Error fetching event products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}