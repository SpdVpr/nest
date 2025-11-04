// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc('sync_products_to_all_sessions')

    if (error) {
      console.error('RPC error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Produkty byly synchronizovány ke všem eventům',
      synced_count: data?.[0]?.synced_count || 0
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Error syncing products:', error)
    console.error('Error details:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to sync products', details: errorMessage },
      { status: 500 }
    )
  }
}
