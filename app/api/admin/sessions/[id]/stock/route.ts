// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: sessionId } = await params

    const { data: stock, error } = await supabase
      .from('session_stock')
      .select(`
        id,
        session_id,
        product_id,
        initial_quantity,
        consumed_quantity,
        remaining_quantity,
        products (
          id,
          name,
          price,
          category,
          image_url,
          is_available
        )
      `)
      .eq('session_id', sessionId)
      .eq('products.is_available', true)
      .order('products(name)', { ascending: true })

    if (error) throw error

    if (stock && stock.length === 0) {
      try {
        await supabase.rpc('sync_products_to_all_sessions')
        const { data: refreshedStock, error: refreshError } = await supabase
          .from('session_stock')
          .select(`
            id,
            session_id,
            product_id,
            initial_quantity,
            consumed_quantity,
            remaining_quantity,
            products (
              id,
              name,
              price,
              category,
              image_url,
              is_available
            )
          `)
          .eq('session_id', sessionId)
          .eq('products.is_available', true)
          .order('products(name)', { ascending: true })
        
        if (!refreshError && refreshedStock) {
          return NextResponse.json({ stock: refreshedStock })
        }
      } catch (syncError) {
        console.error('Error syncing products:', syncError)
      }
    }

    return NextResponse.json({ stock })
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
    const supabase = await createClient()
    const { id: sessionId } = await params
    const { product_id, initial_quantity } = await request.json()

    if (!product_id || initial_quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('session_stock')
      .upsert(
        {
          session_id: sessionId,
          product_id,
          initial_quantity: Math.max(0, initial_quantity),
        },
        {
          onConflict: 'session_id,product_id',
        }
      )
      .select()

    if (error) throw error

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
    const supabase = await createClient()
    const { id: sessionId } = await params
    const { product_id } = await request.json()

    if (!product_id) {
      return NextResponse.json(
        { error: 'Missing product_id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('session_stock')
      .delete()
      .eq('session_id', sessionId)
      .eq('product_id', product_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session stock:', error)
    return NextResponse.json(
      { error: 'Failed to delete stock' },
      { status: 500 }
    )
  }
}
