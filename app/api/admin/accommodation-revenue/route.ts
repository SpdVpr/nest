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

    // Batch-fetch all unique sessions at once (eliminates N+1)
    const sessionIds = new Set<string>()
    guestsSnapshot.docs.forEach(doc => {
      const sid = doc.data().session_id
      if (sid) sessionIds.add(sid)
    })

    const sessionsMap = new Map<string, number>() // session_id -> price_per_night
    if (sessionIds.size > 0) {
      const sessionRefs = Array.from(sessionIds).map(id => db.collection('sessions').doc(id))
      const sessionDocs = await db.getAll(...sessionRefs)
      sessionDocs.forEach(doc => {
        if (doc.exists) {
          sessionsMap.set(doc.id, doc.data()?.price_per_night || 0)
        }
      })
    }

    // Calculate total revenue using cached session data
    let totalRevenue = 0
    guestsSnapshot.docs.forEach(doc => {
      const guestData = doc.data()
      const nightsCount = guestData.nights_count || 1
      const pricePerNight = sessionsMap.get(guestData.session_id) || 0
      totalRevenue += nightsCount * pricePerNight
    })

    return NextResponse.json({ totalRevenue })
  } catch (error) {
    console.error('Error fetching accommodation revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodation revenue' },
      { status: 500 }
    )
  }
}

