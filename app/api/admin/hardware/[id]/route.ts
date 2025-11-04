// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/hardware/[id] - Get single hardware item
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const supabase = createAdminClient()

    const { data: item, error } = await supabase
      .from('hardware_items')
      .select('*')
      .eq('id' as any, id)
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error fetching hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hardware item' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/hardware/[id] - Update hardware item
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    
    const supabase = createAdminClient()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.category !== undefined) updateData.category = body.category
    if (body.price_per_night !== undefined) updateData.price_per_night = body.price_per_night
    if (body.is_available !== undefined) updateData.is_available = body.is_available

    const { data: item, error } = await supabase
      .from('hardware_items')
      .update(updateData)
      .eq('id' as any, id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to update hardware item' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/hardware/[id] - Delete hardware item
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const supabase = createAdminClient()

    // Delete hardware item
    const { error } = await supabase
      .from('hardware_items')
      .delete()
      .eq('id' as any, id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to delete hardware item' },
      { status: 500 }
    )
  }
}