import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getActiveSession, getGuestsBySessionId } from '@/lib/firebase/queries'
import { Timestamp } from 'firebase-admin/firestore'
import { Guest } from '@/types/database.types'

// GET /api/guests - Get all guests from active session
export async function GET() {
  try {
    const activeSession = await getActiveSession()

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      )
    }

    const guests = await getGuestsBySessionId(activeSession.id, true)

    return NextResponse.json({ guests })
  } catch (error) {
    console.error('Error fetching guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

// POST /api/guests - Create new guest
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const activeSession = await getActiveSession()

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active session found. Please contact admin.' },
        { status: 404 }
      )
    }

    const db = getFirebaseAdminDb()
    const guestsRef = db.collection('guests')

    const now = Timestamp.now()
    const guestData = {
      name: name.trim(),
      session_id: activeSession.id,
      nights_count: 1,
      is_active: true,
      created_at: now,
    }

    const docRef = await guestsRef.add(guestData)
    const guest: Guest = {
      id: docRef.id,
      ...guestData,
      created_at: now.toDate().toISOString(),
    }

    return NextResponse.json({ guest }, { status: 201 })
  } catch (error) {
    console.error('Error creating guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
}