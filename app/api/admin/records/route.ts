import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/records - Get all nest records
export async function GET(request: NextRequest) {
    try {
        // Records are public - no auth needed for GET
        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('nest_records')
            .orderBy('category')
            .get()

        const records = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date || null,
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        }))

        return NextResponse.json({ records })
    } catch (error) {
        console.error('Error fetching records:', error)
        return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }
}

// POST /api/admin/records - Create new record
export async function POST(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { category, group_name, date, count } = await request.json()

        if (!category || !group_name || !count) {
            return NextResponse.json({ error: 'category, group_name, and count are required' }, { status: 400 })
        }

        const validCategories = ['attendance', 'pivo', 'redbull', 'bueno', 'jagermeister']
        if (!validCategories.includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()

        const recordData: any = {
            category,
            group_name: group_name.trim(),
            count: parseInt(count),
            date: date || null,
            created_at: Timestamp.now(),
        }

        const docRef = await db.collection('nest_records').add(recordData)

        return NextResponse.json({
            record: {
                id: docRef.id,
                ...recordData,
                created_at: recordData.created_at.toDate().toISOString(),
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating record:', error)
        return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
    }
}

// DELETE /api/admin/records - Delete a record
export async function DELETE(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        await db.collection('nest_records').doc(id).delete()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting record:', error)
        return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
    }
}

// PATCH /api/admin/records - Update a record
export async function PATCH(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, group_name, count, date, category } = await request.json()
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const updateData: any = {}

        if (group_name !== undefined) updateData.group_name = group_name.trim()
        if (count !== undefined) updateData.count = parseInt(count)
        if (date !== undefined) updateData.date = date || null
        if (category !== undefined) {
            const validCategories = ['attendance', 'pivo', 'redbull', 'bueno', 'jagermeister']
            if (validCategories.includes(category)) {
                updateData.category = category
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No data to update' }, { status: 400 })
        }

        await db.collection('nest_records').doc(id).update(updateData)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating record:', error)
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
    }
}
