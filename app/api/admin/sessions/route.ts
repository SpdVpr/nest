import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { Session } from '@/types/database.types'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions - Get all sessions
export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirebaseAdminDb()
    const snapshot = await db.collection('sessions')
      .orderBy('start_date', 'desc')
      .get()

    const sessions: Session[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString(),
      start_date: doc.data().start_date?.toDate().toISOString() || new Date().toISOString(),
      end_date: doc.data().end_date?.toDate().toISOString() || null,
    } as Session))

    // Fetch guest counts for each session
    const guestCounts: Record<string, number> = {}
    await Promise.all(sessions.map(async (s) => {
      const guestsSnap = await db.collection('guests')
        .where('session_id', '==', s.id)
        .where('is_active', '==', true)
        .get()
      guestCounts[s.id] = guestsSnap.size
    }))

    return NextResponse.json({ sessions, guest_counts: guestCounts })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST /api/admin/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, start_date, end_date, start_time, end_time, description, status, menu_enabled, hardware_pricing_enabled, hardware_enabled, seats_enabled, hardware_overrides, surcharge_enabled } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const db = getFirebaseAdminDb()

    // Generate slug from name and date with random 4-digit suffix for uniqueness
    const startDate = start_date || new Date().toISOString()
    const dateStr = new Date(startDate).toISOString().split('T')[0] // YYYY-MM-DD
    const slugBase = `${name}-${dateStr}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)

    // Append random 4-digit number to make the URL hard to guess
    let slug = ''
    while (true) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000) // 1000-9999
      slug = `${slugBase}-${randomSuffix}`

      const existingDoc = await db.collection('sessions')
        .where('slug', '==', slug)
        .limit(1)
        .get()

      if (existingDoc.empty) break // Slug is unique
    }

    const now = Timestamp.now()
    const sessionData: any = {
      name,
      slug,
      is_active: true,
      start_date: Timestamp.fromDate(new Date(startDate)),
      end_date: end_date ? Timestamp.fromDate(new Date(end_date)) : null,
      status: status || 'upcoming',
      description: description || null,
      price_per_night: 0,
      created_at: now,
    }

    // Add times if provided
    if (start_time) {
      sessionData.start_time = start_time
    }
    if (end_time) {
      sessionData.end_time = end_time
    }
    if (menu_enabled !== undefined) {
      sessionData.menu_enabled = Boolean(menu_enabled)
    }
    if (hardware_pricing_enabled !== undefined) {
      sessionData.hardware_pricing_enabled = Boolean(hardware_pricing_enabled)
    } else {
      sessionData.hardware_pricing_enabled = true  // default: pricing enabled
    }
    if (hardware_overrides !== undefined) {
      sessionData.hardware_overrides = hardware_overrides || {}
    }
    if (surcharge_enabled !== undefined) {
      sessionData.surcharge_enabled = Boolean(surcharge_enabled)
    } else {
      sessionData.surcharge_enabled = false  // default: surcharge disabled
    }
    if (hardware_enabled !== undefined) {
      sessionData.hardware_enabled = Boolean(hardware_enabled)
    } else {
      sessionData.hardware_enabled = true  // default: HW reservation enabled
    }
    if (seats_enabled !== undefined) {
      sessionData.seats_enabled = Boolean(seats_enabled)
    } else {
      sessionData.seats_enabled = true  // default: seat reservation enabled
    }

    const docRef = await db.collection('sessions').add(sessionData)
    const session: Session = {
      id: docRef.id,
      ...sessionData,
      created_at: now.toDate().toISOString(),
      start_date: sessionData.start_date.toDate().toISOString(),
      end_date: sessionData.end_date?.toDate().toISOString() || null,
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}