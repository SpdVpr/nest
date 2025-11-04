// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/events/upcoming - Get all upcoming and active events
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .in('status', ['upcoming', 'active'])
      .order('start_date', { ascending: true })

    if (error) throw error

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}