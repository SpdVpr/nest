import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

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

/** Auto-sync records from completed events (runs on every GET, only adds missing) */
async function autoSync() {
    const db = getFirebaseAdminDb()

    const sessionsSnap = await db.collection('sessions').get()
    const now = new Date()
    const completedSessions = sessionsSnap.docs
        .map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Neznámý event',
            start_date: doc.data().start_date?.toDate?.() || new Date(),
            end_date: doc.data().end_date?.toDate?.() || null,
            records_synced: doc.data().records_synced === true,
        }))
        .filter(s => {
            const endDate = s.end_date || s.start_date
            return endDate < now && !s.records_synced
        })

    if (completedSessions.length === 0) return

    // Existing auto-records (only for sessions we're about to process — handles legacy data
    // where some categories may already exist without the records_synced flag set)
    const existingSnap = await db.collection('nest_records').where('source', '==', 'auto').get()
    const existingKeys = new Set(existingSnap.docs.map(doc => {
        const d = doc.data()
        return `${d.category}:${d.session_id}`
    }))

    const newRecords: any[] = []
    const syncedSessionIds: string[] = []

    for (const session of completedSessions) {
        // Attendance
        const guestsSnap = await db.collection('guests')
            .where('session_id', '==', session.id)
            .where('is_active', '==', true)
            .get()

        if (guestsSnap.size > 0 && !existingKeys.has(`attendance:${session.id}`)) {
            newRecords.push({
                category: 'attendance',
                group_name: session.name,
                count: guestsSnap.size,
                date: session.start_date.toISOString().split('T')[0],
                session_id: session.id,
                source: 'auto',
                created_at: Timestamp.now(),
            })
        }

        // Consumption per category
        const consumptionSnap = await db.collection('consumption')
            .where('session_id', '==', session.id)
            .get()

        // Collect unique product IDs and fetch them in parallel
        const productIds = new Set<string>()
        consumptionSnap.docs.forEach(doc => {
            const pid = doc.data().product_id
            if (pid) productIds.add(pid)
        })

        const productNames: Record<string, string> = {}
        await Promise.all(
            Array.from(productIds).map(async pid => {
                const prodDoc = await db.collection('products').doc(pid).get()
                productNames[pid] = prodDoc.exists ? (prodDoc.data()?.name || '') : ''
            })
        )

        const productTotals: Record<string, { name: string; quantity: number }> = {}
        for (const doc of consumptionSnap.docs) {
            const data = doc.data()
            const pid = data.product_id
            if (!productTotals[pid]) {
                productTotals[pid] = { name: productNames[pid] || '', quantity: 0 }
            }
            productTotals[pid].quantity += data.quantity || 0
        }

        for (const [category, keywords] of Object.entries(PRODUCT_CATEGORIES)) {
            if (existingKeys.has(`${category}:${session.id}`)) continue
            let total = 0
            for (const product of Object.values(productTotals)) {
                if (matchesCategory(product.name, keywords)) total += product.quantity
            }
            if (total > 0) {
                newRecords.push({
                    category,
                    group_name: session.name,
                    count: total,
                    date: session.start_date.toISOString().split('T')[0],
                    session_id: session.id,
                    source: 'auto',
                    created_at: Timestamp.now(),
                })
            }
        }

        syncedSessionIds.push(session.id)
    }

    const batch = db.batch()
    for (const record of newRecords) {
        batch.set(db.collection('nest_records').doc(), record)
    }
    // Mark sessions as synced so future calls skip them entirely
    for (const sid of syncedSessionIds) {
        batch.update(db.collection('sessions').doc(sid), { records_synced: true })
    }
    if (newRecords.length > 0 || syncedSessionIds.length > 0) {
        await batch.commit()
    }
}

// GET /api/records - Auto-sync + return all records
export async function GET() {
    try {
        // Auto-sync first (only adds missing records, fast if nothing new)
        try { await autoSync() } catch (e) { console.error('Auto-sync failed:', e) }

        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('nest_records').get()

        const records = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date || null,
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        }))

        // Sort in memory
        records.sort((a: any, b: any) => (a.category || '').localeCompare(b.category || ''))

        return NextResponse.json({ records })
    } catch (error) {
        console.error('Error fetching records:', error)
        return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
    }
}
