import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// POST /api/admin/records/sync - Sync automatic records from past events
export async function POST(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = getFirebaseAdminDb()

        // Get all sessions
        const sessionsSnap = await db.collection('sessions').get()
        const sessions = sessionsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Neznámý event',
            start_date: doc.data().start_date?.toDate?.() || new Date(),
            end_date: doc.data().end_date?.toDate?.() || null,
        }))

        // Only process completed events (end_date or start_date in the past)
        const now = new Date()
        const completedSessions = sessions.filter(s => {
            const endDate = s.end_date || s.start_date
            return endDate < now
        })

        if (completedSessions.length === 0) {
            return NextResponse.json({ message: 'No completed sessions found', added: 0 })
        }

        // Get all existing auto-records to avoid duplicates
        const existingSnap = await db.collection('nest_records')
            .where('source', '==', 'auto')
            .get()
        const existingKeys = new Set(
            existingSnap.docs.map(doc => {
                const d = doc.data()
                return `${d.category}:${d.session_id}`
            })
        )

        // Product categories to track for records
        const PRODUCT_CATEGORIES: Record<string, string[]> = {
            'pivo': ['pivo', 'beer', 'plzeň', 'pilsner', 'lager', 'kozel', 'staropramen', 'budvar', 'gambrinus'],
            'redbull': ['red bull', 'redbull'],
            'bueno': ['bueno', 'kinder'],
            'jagermeister': ['jäger', 'jager', 'jägermeister', 'jagermeister'],
        }

        const matchesCategory = (productName: string, keywords: string[]): boolean => {
            const lower = productName.toLowerCase()
            return keywords.some(kw => lower.includes(kw))
        }

        const newRecords: any[] = []

        for (const session of completedSessions) {
            // 1. Attendance record
            const guestsSnap = await db.collection('guests')
                .where('session_id', '==', session.id)
                .where('is_active', '==', true)
                .get()

            const guestCount = guestsSnap.size
            const attendanceKey = `attendance:${session.id}`

            if (guestCount > 0 && !existingKeys.has(attendanceKey)) {
                newRecords.push({
                    category: 'attendance',
                    group_name: session.name,
                    count: guestCount,
                    date: session.start_date.toISOString().split('T')[0],
                    session_id: session.id,
                    source: 'auto',
                    created_at: Timestamp.now(),
                })
                existingKeys.add(attendanceKey)
            }

            // 2. Consumption records per category
            const consumptionSnap = await db.collection('consumption')
                .where('session_id', '==', session.id)
                .get()

            // Aggregate consumption by product
            const productTotals: Record<string, { name: string; quantity: number }> = {}
            for (const doc of consumptionSnap.docs) {
                const data = doc.data()
                const pid = data.product_id
                if (!productTotals[pid]) {
                    // Fetch product name
                    const prodDoc = await db.collection('products').doc(pid).get()
                    productTotals[pid] = {
                        name: prodDoc.exists ? (prodDoc.data()?.name || 'Neznámé') : 'Neznámé',
                        quantity: 0,
                    }
                }
                productTotals[pid].quantity += data.quantity || 0
            }

            // Check each category
            for (const [category, keywords] of Object.entries(PRODUCT_CATEGORIES)) {
                const catKey = `${category}:${session.id}`
                if (existingKeys.has(catKey)) continue

                // Sum all matching products
                let totalForCategory = 0
                for (const [, product] of Object.entries(productTotals)) {
                    if (matchesCategory(product.name, keywords)) {
                        totalForCategory += product.quantity
                    }
                }

                if (totalForCategory > 0) {
                    newRecords.push({
                        category,
                        group_name: session.name,
                        count: totalForCategory,
                        date: session.start_date.toISOString().split('T')[0],
                        session_id: session.id,
                        source: 'auto',
                        created_at: Timestamp.now(),
                    })
                    existingKeys.add(catKey)
                }
            }
        }

        // Batch write new records
        if (newRecords.length > 0) {
            const batch = db.batch()
            for (const record of newRecords) {
                const ref = db.collection('nest_records').doc()
                batch.set(ref, record)
            }
            await batch.commit()
        }

        return NextResponse.json({
            message: `Synced ${newRecords.length} records from ${completedSessions.length} completed events`,
            added: newRecords.length,
            records: newRecords.map(r => ({ category: r.category, group_name: r.group_name, count: r.count })),
        })
    } catch (error) {
        console.error('Error syncing records:', error)
        return NextResponse.json({ error: 'Failed to sync records' }, { status: 500 })
    }
}
