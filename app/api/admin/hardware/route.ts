// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Verify admin authentication
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/hardware - Get ALL hardware items
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: items, error } = await supabase
      .from('hardware_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error fetching hardware items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hardware items' },
      { status: 500 }
    )
  }
}

// POST /api/admin/hardware - Create new hardware item
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, category, price_per_night, is_available } = body

    if (!name || !type || !category || price_per_night === undefined) {
      return NextResponse.json(
        { error: 'Name, type, category and price_per_night are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: item, error } = await supabase
      .from('hardware_items')
      .insert({
        name,
        type,
        category,
        price_per_night,
        is_available: is_available !== undefined ? is_available : true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error creating hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to create hardware item' },
      { status: 500 }
    )
  }
}