import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Session } from '@/types/database.types'

// GET /api/events/upcoming - Get all upcoming and active events
export async function GET() {
  try {
    const db = getFirebaseAdminDb()
    const sessionsRef = db.collection('sessions')
    const snapshot = await sessionsRef
      .where('status', 'in', ['upcoming', 'active'])
      .orderBy('start_date', 'asc')
      .get()

    const sessions: Session[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString(),
      start_date: doc.data().start_date?.toDate().toISOString() || new Date().toISOString(),
      end_date: doc.data().end_date?.toDate().toISOString() || null,
    } as Session))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}