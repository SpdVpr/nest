import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Session } from '@/types/database.types'

// GET /api/sessions/active - Get active session
export async function GET() {
  try {
    const db = getFirebaseAdminDb()
    const sessionsRef = db.collection('sessions')
    const snapshot = await sessionsRef
      .where('is_active', '==', true)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      )
    }

    const doc = snapshot.docs[0]
    const session: Session = {
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString(),
      start_date: doc.data().start_date?.toDate().toISOString() || new Date().toISOString(),
      end_date: doc.data().end_date?.toDate().toISOString() || null,
    } as Session

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error fetching active session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    )
  }
}