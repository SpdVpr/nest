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

    const sessionsMap = new Map<string, { price_per_night: number; surcharge_enabled: boolean }>()
    if (sessionIds.size > 0) {
      const sessionRefs = Array.from(sessionIds).map(id => db.collection('sessions').doc(id))
      const sessionDocs = await db.getAll(...sessionRefs)
      sessionDocs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data()
          sessionsMap.set(doc.id, {
            price_per_night: data?.price_per_night || 0,
            surcharge_enabled: data?.surcharge_enabled === true,
          })
        }
      })
    }

    // Count guests per session for surcharge calculation
    const guestsPerSession = new Map<string, number>()
    guestsSnapshot.docs.forEach(doc => {
      const sid = doc.data().session_id
      guestsPerSession.set(sid, (guestsPerSession.get(sid) || 0) + 1)
    })

    // Calculate total revenue with surcharge
    let totalRevenue = 0
    guestsSnapshot.docs.forEach(doc => {
      const guestData = doc.data()
      const nightsCount = guestData.nights_count || 1
      const sessionInfo = sessionsMap.get(guestData.session_id)
      if (!sessionInfo) return
      const totalGuests = guestsPerSession.get(guestData.session_id) || 0
      const missingGuests = sessionInfo.surcharge_enabled ? Math.max(0, 10 - totalGuests) : 0
      const surchargePerNight = missingGuests * 150
      const effectivePrice = sessionInfo.price_per_night + surchargePerNight
      totalRevenue += nightsCount * effectivePrice
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

