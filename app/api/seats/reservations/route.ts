// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SeatReservation } from '@/types/database.types'

// GET /api/seats/reservations?session_id=xxx - Get all seat reservations for a session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: reservations, error } = await supabase
      .from('seat_reservations')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching seat reservations:', error)
      return NextResponse.json({ error: 'Failed to fetch seat reservations' }, { status: 500 })
    }

    return NextResponse.json({ reservations: reservations || [] })
  } catch (error) {
    console.error('Error in seat reservations GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seats/reservations - Create a new seat reservation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { seat_id, guest_id, session_id, guest_name } = body

    console.log('Seat reservation POST received:', { seat_id, guest_id, session_id, guest_name })

    // Validation
    if (!seat_id || !guest_id || !session_id || !guest_name) {
      return NextResponse.json({ 
        error: 'seat_id, guest_id, session_id, and guest_name are required' 
      }, { status: 400 })
    }

    // Check if seat is already reserved for this session
    const { data: existing } = await supabase
      .from('seat_reservations')
      .select('*')
      .eq('seat_id', seat_id)
      .eq('session_id', session_id)
      .maybeSingle()

    if (existing) {
      const reservation = existing as SeatReservation
      return NextResponse.json({
        error: 'Toto místo je již rezervované',
        details: `Místo ${seat_id} je rezervováno pro ${reservation.guest_name}`
      }, { status: 409 })
    }

    // Create the reservation
    const { data, error } = await supabase
      .from('seat_reservations')
      .insert({
        seat_id,
        guest_id,
        session_id,
        guest_name,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating seat reservation:', error)
      return NextResponse.json({ 
        error: 'Failed to create seat reservation',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ reservation: data })
  } catch (error) {
    console.error('Error in seat reservations POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

