import { NextRequest, NextResponse } from 'next/server'
import { getSessionBySlug } from '@/lib/firebase/queries'

// GET /api/event/[slug] - Get event details by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await getSessionBySlug(slug)

    if (!session) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}