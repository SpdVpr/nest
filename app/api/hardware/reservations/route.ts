// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { guest_id, hardware_item_ids, nights_count, session_id } = body

    console.log('Reservation POST received:', { guest_id, hardware_item_ids, nights_count, session_id })

    // Detailed validation
    if (!guest_id) {
      return NextResponse.json({ error: 'Missing guest_id' }, { status: 400 })
    }
    if (!hardware_item_ids || !Array.isArray(hardware_item_ids)) {
      return NextResponse.json({ error: 'hardware_item_ids must be an array' }, { status: 400 })
    }
    if (hardware_item_ids.length === 0) {
      return NextResponse.json({ error: 'hardware_item_ids cannot be empty' }, { status: 400 })
    }

    // Get session - use provided session_id or find active session
    let activeSessionId: string | null = null
    
    if (session_id) {
      console.log('Using provided session_id:', session_id)
      // Use provided session_id (from event-specific page)
      const { data: session, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', session_id)
        .single()
      
      if (error) {
        console.error('Error fetching session by id:', error)
      }
      
      if (session) {
        activeSessionId = session.id
        console.log('Found session:', activeSessionId)
      }
    } else {
      console.log('Looking for active session')
      // Find active session (from public page)
      const { data: activeSession, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .single()
      
      if (error) {
        console.error('Error fetching active session:', error)
      }
      
      if (activeSession) {
        activeSessionId = activeSession.id
        console.log('Found active session:', activeSessionId)
      }
    }

    if (!activeSessionId) {
      console.error('No session found. session_id was:', session_id)
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Get hardware items to calculate prices
    const { data: items, error: itemsError } = await supabase
      .from('hardware_items')
      .select('id, price_per_night')
      .in('id', hardware_item_ids)

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Failed to fetch hardware items' }, { status: 500 })
    }

    // Create reservations for each item
    const reservations = items.map(item => ({
      hardware_item_id: item.id,
      guest_id,
      session_id: activeSessionId,
      nights_count: nights_count || 1,
      total_price: item.price_per_night * (nights_count || 1),
      status: 'active'
    }))

    const { data, error } = await supabase
      .from('hardware_reservations')
      .insert(reservations)
      .select()

    if (error) {
      console.error('Error creating reservations:', error)
      return NextResponse.json({ 
        error: 'Failed to create reservations',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ reservations: data })
  } catch (error) {
    console.error('Error in hardware reservations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check for session_id in query params
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')

    // Get active session
    let activeSessionId: string | null = null
    
    if (sessionId) {
      // Use provided session_id
      const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', sessionId)
        .single()
      
      if (session) {
        activeSessionId = session.id
      }
    } else {
      // Find active session
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .single()
      
      if (activeSession) {
        activeSessionId = activeSession.id
      }
    }

    if (!activeSessionId) {
      return NextResponse.json({ reservations: [] })
    }

    const { data: reservations, error } = await supabase
      .from('hardware_reservations')
      .select(`
        *,
        hardware_items (*),
        guests (id, name)
      `)
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reservations:', error)
      return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
    }

    return NextResponse.json({ reservations: reservations || [] })
  } catch (error) {
    console.error('Error in hardware reservations GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}