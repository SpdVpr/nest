// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/reservations - Get hardware reservations for session
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await context.params
    const supabase = createAdminClient()

    // First get all guests for this session
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('id')
      .eq('session_id', sessionId)

    if (guestsError) throw guestsError

    const guestIds = guests?.map(g => g.id) || []

    // Get hardware reservations for these guests
    let query = supabase
      .from('hardware_reservations')
      .select('*')

    if (guestIds.length > 0) {
      query = query.in('guest_id', guestIds)
    } else {
      // No guests, return empty
      return NextResponse.json({ reservations: [] })
    }

    const { data: reservations, error } = await query

    if (error) throw error

    return NextResponse.json({ reservations: reservations || [] })
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}