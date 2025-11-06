// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/accommodation-revenue - Get total accommodation revenue
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    // Get all active guests
    const guestsSnapshot = await db.collection('guests')
      .where('is_active', '==', true)
      .get()

    // For each guest, get their session to find price_per_night
    let totalRevenue = 0

    await Promise.all(
      guestsSnapshot.docs.map(async (guestDoc) => {
        const guestData = guestDoc.data()
        const sessionId = guestData.session_id
        const nightsCount = guestData.nights_count || 1

        if (sessionId) {
          const sessionDoc = await db.collection('sessions').doc(sessionId).get()
          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data()
            const pricePerNight = sessionData?.price_per_night || 0
            totalRevenue += nightsCount * pricePerNight
          }
        }
      })
    )

    return NextResponse.json({ totalRevenue })
  } catch (error) {
    console.error('Error fetching accommodation revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodation revenue' },
      { status: 500 }
    )
  }
}

