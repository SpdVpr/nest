// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/meal-templates - List all meal templates
export async function GET(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('meal_templates').get()

        const templates = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                name: data.name,
                allergens: data.allergens || [],
                category: data.category || 'other',
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        })

        templates.sort((a: any, b: any) => a.name.localeCompare(b.name, 'cs'))

        return NextResponse.json({ templates })
    } catch (error) {
        console.error('Error fetching meal templates:', error)
        return NextResponse.json({ error: 'Failed to fetch meal templates' }, { status: 500 })
    }
}

// POST /api/admin/meal-templates - Create meal template
export async function POST(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, category, allergens } = await request.json()

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const now = Timestamp.now()

        const docRef = await db.collection('meal_templates').add({
            name: name.trim(),
            category: category || 'other',
            allergens: allergens || [],
            created_at: now,
        })

        return NextResponse.json({
            template: { id: docRef.id, name: name.trim(), category: category || 'other', allergens: allergens || [] }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating meal template:', error)
        return NextResponse.json({ error: 'Failed to create meal template' }, { status: 500 })
    }
}

// DELETE /api/admin/meal-templates - Delete meal template
export async function DELETE(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        await db.collection('meal_templates').doc(id).delete()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting meal template:', error)
        return NextResponse.json({ error: 'Failed to delete meal template' }, { status: 500 })
    }
}

// PATCH /api/admin/meal-templates - Update meal template
export async function PATCH(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, name, allergens } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const updateData: any = {}
        if (name !== undefined) updateData.name = name.trim()
        if (allergens !== undefined) updateData.allergens = allergens

        await db.collection('meal_templates').doc(id).update(updateData)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating meal template:', error)
        return NextResponse.json({ error: 'Failed to update meal template' }, { status: 500 })
    }
}
