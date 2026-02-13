import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// GET /api/admin/sessions/[id]/settlement - Get settlement data for all guests
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (token !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id: sessionId } = await params
        const db = getFirebaseAdminDb()

        // Fetch all settlement records for this session
        const settlementsSnapshot = await db.collection('settlements')
            .where('session_id', '==', sessionId)
            .get()

        const settlements: Record<string, any> = {}
        settlementsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            settlements[data.guest_id] = {
                id: doc.id,
                ...data,
            }
        })

        // Fetch bank account settings
        const settingsDoc = await db.collection('admin_settings').doc('general').get()
        const bankSettings = settingsDoc.exists ? settingsDoc.data() : null

        return NextResponse.json({ settlements, bankSettings })
    } catch (error) {
        console.error('Error fetching settlement:', error)
        return NextResponse.json({ error: 'Failed to fetch settlement' }, { status: 500 })
    }
}

// POST /api/admin/sessions/[id]/settlement - Update settlement for a guest
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (token !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id: sessionId } = await params
        const body = await request.json()
        const { guest_id, action, adjustments, overrides, custom_items, notes, status, variable_symbol } = body

        const db = getFirebaseAdminDb()

        // Find existing settlement
        const existingSnapshot = await db.collection('settlements')
            .where('session_id', '==', sessionId)
            .where('guest_id', '==', guest_id)
            .limit(1)
            .get()

        const now = new Date().toISOString()

        if (action === 'generate_qr') {
            // Generate QR → set status to pending
            const data: any = {
                session_id: sessionId,
                guest_id,
                status: 'pending',
                qr_generated_at: now,
                updated_at: now,
            }

            if (variable_symbol) data.variable_symbol = variable_symbol
            if (adjustments !== undefined) data.adjustments = adjustments
            if (overrides !== undefined) data.overrides = overrides
            if (notes !== undefined) data.notes = notes

            if (!existingSnapshot.empty) {
                await existingSnapshot.docs[0].ref.update(data)
            } else {
                await db.collection('settlements').add({
                    ...data,
                    created_at: now,
                })
            }

            return NextResponse.json({ success: true, status: 'pending' })
        }

        if (action === 'mark_paid') {
            const data: any = {
                status: 'paid',
                paid_at: now,
                updated_at: now,
            }

            if (!existingSnapshot.empty) {
                await existingSnapshot.docs[0].ref.update(data)
            } else {
                await db.collection('settlements').add({
                    session_id: sessionId,
                    guest_id,
                    ...data,
                    created_at: now,
                })
            }

            return NextResponse.json({ success: true, status: 'paid' })
        }

        if (action === 'mark_unpaid') {
            if (!existingSnapshot.empty) {
                await existingSnapshot.docs[0].ref.update({
                    status: 'pending',
                    paid_at: null,
                    updated_at: now,
                })
            }

            return NextResponse.json({ success: true, status: 'pending' })
        }

        if (action === 'update') {
            const data: any = { updated_at: now }
            if (adjustments !== undefined) data.adjustments = adjustments
            if (overrides !== undefined) data.overrides = overrides
            if (custom_items !== undefined) data.custom_items = custom_items
            if (notes !== undefined) data.notes = notes
            if (status !== undefined) data.status = status

            if (!existingSnapshot.empty) {
                await existingSnapshot.docs[0].ref.update(data)
            } else {
                await db.collection('settlements').add({
                    session_id: sessionId,
                    guest_id,
                    status: status || 'draft',
                    adjustments: adjustments || [],
                    custom_items: custom_items || [],
                    overrides: overrides || {},
                    notes: notes || '',
                    ...data,
                    created_at: now,
                })
            }

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Error updating settlement:', error)
        return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 })
    }
}
