// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/sessions/active - Get active session
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error fetching active session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    )
  }
}