// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/seats/reservations/[id] - Delete a seat reservation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('seat_reservations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting seat reservation:', error)
      return NextResponse.json({ error: 'Failed to delete seat reservation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in seat reservation DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

