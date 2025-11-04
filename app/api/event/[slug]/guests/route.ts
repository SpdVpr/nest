// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/event/[slug]/guests - Get guests for specific event
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

    // Get guests for this session with their consumption
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select(`
        *,
        consumption (
          id,
          quantity,
          products:product_id (*)
        )
      `)
      .eq('session_id', session.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (guestsError) throw guestsError

    // Calculate totals for each guest
    const guestsWithTotals = guests.map(guest => {
      const totalItems = guest.consumption.reduce((sum, c) => sum + c.quantity, 0)
      const totalPrice = guest.consumption.reduce(
        (sum, c) => sum + (c.quantity * c.products.price), 
        0
      )
      const totalBeers = guest.consumption
        .filter(c => c.products.category?.toLowerCase().includes('pivo'))
        .reduce((sum, c) => sum + c.quantity, 0)

      return {
        ...guest,
        totalItems,
        totalPrice,
        totalBeers
      }
    })

    return NextResponse.json({ 
      guests: guestsWithTotals,
      session_id: session.id 
    })
  } catch (error) {
    console.error('Error fetching event guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

// POST /api/event/[slug]/guests - Register new guest for event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params
    const body = await request.json()
    const { name, nights_count = 1, check_in_date, check_out_date } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const nightsNum = parseInt(nights_count)
    if (isNaN(nightsNum) || nightsNum < 1) {
      return NextResponse.json(
        { error: 'nights_count must be a positive number' },
        { status: 400 }
      )
    }

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('slug', slug)

    if (sessionError) {
      console.error('Session fetch error:', sessionError)
      throw sessionError
    }

    if (!session || session.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const sessionId = session[0].id

    // Create guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .insert({
        name: name.trim(),
        session_id: sessionId,
        nights_count: nightsNum,
        check_in_date: check_in_date ? new Date(check_in_date).toISOString() : null,
        check_out_date: check_out_date ? new Date(check_out_date).toISOString() : null,
        is_active: true
      })
      .select()
      .single()

    if (guestError) {
      console.error('Guest creation error:', guestError)
      const errorMessage = guestError.message || JSON.stringify(guestError)
      return NextResponse.json(
        { error: `Failed to create guest: ${errorMessage}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Error creating guest:', error)
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json(
      { error: `Failed to create guest: ${errorMessage}` },
      { status: 500 }
    )
  }
}