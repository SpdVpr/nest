import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
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

    // Count active guests for dynamic pricing
    const db = getFirebaseAdminDb()
    const guestsSnapshot = await db.collection('guests')
      .where('session_id', '==', session.id)
      .where('is_active', '==', true)
      .get()

    return NextResponse.json({
      session,
      guest_count: guestsSnapshot.size,
    })
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}