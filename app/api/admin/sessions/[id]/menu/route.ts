// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/menu - Get all menu items for session
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const db = getFirebaseAdminDb()

        const snapshot = await db.collection('menu_items')
            .where('session_id', '==', id)
            .get()

        const items = snapshot.docs.map(doc => {
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

        return NextResponse.json({ items })
    } catch (error) {
        console.error('Error fetching menu items:', error)
        return NextResponse.json(
            { error: 'Failed to fetch menu items' },
            { status: 500 }
        )
    }
}

// POST /api/admin/sessions/[id]/menu - Create menu item
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const body = await request.json()
        const { day_index, meal_type, time, description, order } = body

        if (day_index === undefined || !meal_type || !time || !description) {
            return NextResponse.json(
                { error: 'day_index, meal_type, time, and description are required' },
                { status: 400 }
            )
        }

        const db = getFirebaseAdminDb()
        const now = Timestamp.now()

        const itemData = {
            session_id: id,
            day_index: Number(day_index),
            meal_type,
            time,
            description,
            order: order || 0,
            created_at: now,
        }

        const docRef = await db.collection('menu_items').add(itemData)

        return NextResponse.json({
            item: {
                id: docRef.id,
                ...itemData,
                created_at: now.toDate().toISOString(),
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating menu item:', error)
        return NextResponse.json(
            { error: 'Failed to create menu item' },
            { status: 500 }
        )
    }
}

// PUT /api/admin/sessions/[id]/menu - Bulk save menu items (replace all)
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const { items } = await request.json()

        if (!Array.isArray(items)) {
            return NextResponse.json(
                { error: 'items array is required' },
                { status: 400 }
            )
        }

        const db = getFirebaseAdminDb()

        // Delete existing menu items for this session
        const existingSnapshot = await db.collection('menu_items')
            .where('session_id', '==', id)
            .get()

        const batch = db.batch()
        existingSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref)
        })

        // Add new items
        const now = Timestamp.now()
        const savedItems: any[] = []

        for (const item of items) {
            const ref = db.collection('menu_items').doc()
            const itemData = {
                session_id: id,
                day_index: Number(item.day_index),
                meal_type: item.meal_type,
                time: item.time,
                description: item.description,
                order: item.order || 0,
                created_at: now,
            }
            batch.set(ref, itemData)
            savedItems.push({
                id: ref.id,
                ...itemData,
                created_at: now.toDate().toISOString(),
            })
        }

        await batch.commit()

        return NextResponse.json({ items: savedItems })
    } catch (error) {
        console.error('Error saving menu items:', error)
        return NextResponse.json(
            { error: 'Failed to save menu items' },
            { status: 500 }
        )
    }
}
