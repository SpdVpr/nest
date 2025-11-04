// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/consumption - Add consumption record
export async function POST(request: NextRequest) {
  try {
    const { guest_id, product_id, quantity, session_id } = await request.json()

    if (!guest_id || !product_id) {
      return NextResponse.json(
        { error: 'guest_id and product_id are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let sessionToUse = session_id

    if (!sessionToUse) {
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
      sessionToUse = activeSession.id
    }

    // Create consumption record
    const { data: consumption, error } = await supabase
      .from('consumption')
      .insert({
        guest_id,
        product_id,
        quantity: quantity || 1,
        session_id: sessionToUse,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ consumption }, { status: 201 })
  } catch (error) {
    console.error('Error creating consumption:', error)
    return NextResponse.json(
      { error: 'Failed to create consumption record' },
      { status: 500 }
    )
  }
}

// GET /api/consumption?guest_id=xxx - Get consumption for a guest
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const guestId = searchParams.get('guest_id')

    if (!guestId) {
      return NextResponse.json(
        { error: 'guest_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: consumption, error } = await supabase
      .from('consumption')
      .select(`
        *,
        products (
          id,
          name,
          price,
          image_url
        )
      `)
      .eq('guest_id', guestId)
      .order('consumed_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ consumption: consumption || [] })
  } catch (error) {
    console.error('Error fetching consumption:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consumption' },
      { status: 500 }
    )
  }
}

// DELETE /api/consumption?id=xxx - Delete a consumption record
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const consumptionId = searchParams.get('id')

    if (!consumptionId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('consumption')
      .delete()
      .eq('id', consumptionId)

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting consumption:', error)
    return NextResponse.json(
      { error: 'Failed to delete consumption record' },
      { status: 500 }
    )
  }
}