import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// GET /api/records - Get all nest records (public)
export async function GET() {
    try {
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
