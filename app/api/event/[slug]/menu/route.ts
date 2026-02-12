// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

// GET /api/event/[slug]/menu - Get menu for event
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const db = getFirebaseAdminDb()

        // Find session by slug
        const sessionSnapshot = await db.collection('sessions')
            .where('slug', '==', slug)
            .limit(1)
            .get()

        if (sessionSnapshot.empty) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const sessionDoc = sessionSnapshot.docs[0]
        const sessionData = sessionDoc.data()

        // Check if menu is enabled
        if (!sessionData.menu_enabled) {
            return NextResponse.json({ items: [], enabled: false })
        }

        // Fetch menu items
        const menuSnapshot = await db.collection('menu_items')
            .where('session_id', '==', sessionDoc.id)
            .get()

        const items = menuSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        })

        // Sort by day_index, then order
        items.sort((a: any, b: any) => {
            if (a.day_index !== b.day_index) return a.day_index - b.day_index
            return (a.order || 0) - (b.order || 0)
        })

        return NextResponse.json({ items, enabled: true })
    } catch (error) {
        console.error('Error fetching menu:', error)
        return NextResponse.json(
            { error: 'Failed to fetch menu' },
            { status: 500 }
        )
    }
}

// POST /api/event/[slug]/menu - Save guest meal selection
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const { guest_id, first_meal_id, last_meal_id, dietary_restrictions, dietary_note } = await request.json()

        if (!guest_id) {
            return NextResponse.json({ error: 'guest_id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()

        // Find session
        const sessionSnapshot = await db.collection('sessions')
            .where('slug', '==', slug)
            .limit(1)
            .get()

        if (sessionSnapshot.empty) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const sessionId = sessionSnapshot.docs[0].id
        const now = Timestamp.now()

        // Update guest dietary info
        const guestRef = db.collection('guests').doc(guest_id)
        const guestDoc = await guestRef.get()
        if (!guestDoc.exists) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
        }

        const guestUpdate: any = {}
        if (dietary_restrictions !== undefined) {
            guestUpdate.dietary_restrictions = dietary_restrictions
        }
        if (dietary_note !== undefined) {
            guestUpdate.dietary_note = dietary_note
        }
        if (Object.keys(guestUpdate).length > 0) {
            await guestRef.update(guestUpdate)
        }

        // Upsert meal selection
        const selectionSnapshot = await db.collection('guest_meal_selections')
            .where('guest_id', '==', guest_id)
            .where('session_id', '==', sessionId)
            .limit(1)
            .get()

        if (selectionSnapshot.empty) {
            // Create new
            const selRef = await db.collection('guest_meal_selections').add({
                guest_id,
                session_id: sessionId,
                first_meal_id: first_meal_id || null,
                last_meal_id: last_meal_id || null,
                created_at: now,
                updated_at: now,
            })

            return NextResponse.json({
                selection: {
                    id: selRef.id,
                    guest_id,
                    session_id: sessionId,
                    first_meal_id: first_meal_id || null,
                    last_meal_id: last_meal_id || null,
                }
            }, { status: 201 })
        } else {
            // Update existing
            const existingDoc = selectionSnapshot.docs[0]
            await existingDoc.ref.update({
                first_meal_id: first_meal_id || null,
                last_meal_id: last_meal_id || null,
                updated_at: now,
            })

            return NextResponse.json({
                selection: {
                    id: existingDoc.id,
                    guest_id,
                    session_id: sessionId,
                    first_meal_id: first_meal_id || null,
                    last_meal_id: last_meal_id || null,
                }
            })
        }
    } catch (error) {
        console.error('Error saving meal selection:', error)
        return NextResponse.json(
            { error: 'Failed to save meal selection' },
            { status: 500 }
        )
    }
}
