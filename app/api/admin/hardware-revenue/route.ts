// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/hardware-revenue - Get total hardware revenue
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()

    // Get all active hardware reservations
    const reservationsSnapshot = await db.collection('hardware_reservations')
      .where('status', '==', 'active')
      .get()

    // Calculate total revenue from hardware reservations
    const totalRevenue = reservationsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data()
      return sum + (data.total_price || 0)
    }, 0)

    return NextResponse.json({ totalRevenue })
  } catch (error) {
    console.error('Error fetching hardware revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hardware revenue' },
      { status: 500 }
    )
  }
}

