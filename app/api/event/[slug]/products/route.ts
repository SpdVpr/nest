import { NextRequest, NextResponse } from 'next/server'
import { getSessionBySlug, getAvailableProducts } from '@/lib/firebase/queries'

// GET /api/event/[slug]/products - Get products for specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // First get the session
    const session = await getSessionBySlug(slug)
    if (!session) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get all available products
    // Note: Firebase doesn't have session_stock table like Supabase
    // We're just returning all available products for now
    const products = await getAvailableProducts()

    return NextResponse.json({
      products,
      session_id: session.id
    })
  } catch (error) {
    console.error('Error fetching event products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}