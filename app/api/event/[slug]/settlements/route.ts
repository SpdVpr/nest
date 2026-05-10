import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getSessionBySlug } from '@/lib/firebase/queries'

// GET /api/event/[slug]/settlements — public-facing settlement statuses per guest.
// Used by the hardware page to lock reservations once settlement is finalized.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await getSessionBySlug(slug)
    if (!session) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const db = getFirebaseAdminDb()
    const snap = await db.collection('settlements')
      .where('session_id', '==', session.id)
      .get()

    const settlements: Record<string, {
      status: string
      payment_method: string
      qr_generated_at: string | null
      paid_at: string | null
    }> = {}

    snap.docs.forEach(doc => {
      const data = doc.data()
      settlements[data.guest_id] = {
        status: data.status || 'draft',
        payment_method: data.payment_method || 'qr',
        qr_generated_at: data.qr_generated_at || null,
        paid_at: data.paid_at || null,
      }
    })

    return NextResponse.json({ settlements })
  } catch (error) {
    console.error('Error fetching settlements:', error)
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 })
  }
}
