// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/consumption - Get consumption records for session
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

    // Get consumption records for these guests with product info
    let query = supabase
      .from('consumption')
      .select('*, products(name, price)')
      .order('consumed_at', { ascending: false })

    if (guestIds.length > 0) {
      query = query.in('guest_id', guestIds)
    } else {
      // No guests, return empty
      return NextResponse.json({ consumption: [] })
    }

    const { data: consumption, error } = await query

    if (error) throw error

    return NextResponse.json({ consumption: consumption || [] })
  } catch (error) {
    console.error('Error fetching consumption:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consumption', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}