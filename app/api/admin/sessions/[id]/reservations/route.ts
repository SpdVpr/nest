// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/reservations - Get hardware reservations for session
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await context.params
    const db = getFirebaseAdminDb()

    // Get hardware reservations for this session
    const reservationsSnapshot = await db.collection('hardware_reservations')
      .where('session_id', '==', sessionId)
      .get()

    const reservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data()?.created_at?.toDate?.()?.toISOString() || doc.data()?.created_at,
      updated_at: doc.data()?.updated_at?.toDate?.()?.toISOString() || doc.data()?.updated_at,
    }))

    return NextResponse.json({ reservations })
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}