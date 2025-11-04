// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions - Get all sessions
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST /api/admin/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, start_date, end_date, description, status } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate slug from name and date
    const startDate = start_date || new Date().toISOString()
    const dateStr = new Date(startDate).toISOString().split('T')[0] // YYYY-MM-DD
    const slugBase = `${name}-${dateStr}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
    
    // Check for unique slug
    let slug = slugBase
    let counter = 0
    while (true) {
      const { data } = await supabase
        .from('sessions')
        .select('id')
        .eq('slug', slug)
        .single()
      
      if (!data) break // Slug is unique
      
      counter++
      slug = `${slugBase}-${counter}`
    }

    const sessionData: any = { 
      name, 
      slug,
      is_active: true,
      start_date: startDate,
      status: status || 'upcoming',
      description: description || null
    }

    if (end_date) {
      sessionData.end_date = end_date
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}