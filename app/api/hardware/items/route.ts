import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: items, error } = await supabase
      .from('hardware_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching hardware items:', error)
      return NextResponse.json({ error: 'Failed to fetch hardware items' }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error in hardware items API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}