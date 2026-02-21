// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// PUT /api/admin/hardware/reorder - Bulk update sort_order
export async function PUT(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { items } = body // Array of { id: string, sort_order: number }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const batch = db.batch()

        for (const item of items) {
            if (item.id && item.sort_order !== undefined) {
                const ref = db.collection('hardware_items').doc(item.id)
                batch.update(ref, { sort_order: item.sort_order })
            }
        }

        await batch.commit()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error reordering hardware items:', error)
        return NextResponse.json(
            { error: 'Failed to reorder hardware items' },
            { status: 500 }
        )
    }
}
