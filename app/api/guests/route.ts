// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/guests - Get all guests from active session
export async function GET() {
  try {
    const supabase = await createClient()

    // First, get the active session
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
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .eq('session_id', activeSession.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ guests: guests || [] })
  } catch (error) {
    console.error('Error fetching guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

// POST /api/guests - Create new guest
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get active session
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active session found. Please contact admin.' },
        { status: 404 }
      )
    }

    // Create guest
    const { data: guest, error } = await supabase
      .from('guests')
      .insert({
        name: name.trim(),
        session_id: activeSession.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Error creating guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
}