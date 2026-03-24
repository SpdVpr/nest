import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

const PRODUCT_MATCHERS: Record<string, (name: string, category: string) => boolean> = {
    pivo: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('pivo') || l.includes('beer') || l.includes('plzeň') || l.includes('pilsner') || l.includes('lager') || l.includes('kozel') || l.includes('staropramen') || l.includes('budvar') || l.includes('gambrinus') },
    redbull: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('red bull') || l.includes('redbull') },
    bueno: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('bueno') || l.includes('kinder') },
    jagermeister: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('jäger') || l.includes('jager') || l.includes('jägermeister') || l.includes('jagermeister') },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
    try {
        const { uid } = await params
        const db = getFirebaseAdminDb()

        // Verify user exists and is registered
        const userDoc = await db.collection('users').doc(uid).get()
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        const userData = userDoc.data()!

        // Get all guests claimed by this user
        const guestsSnap = await db.collection('guests').where('user_id', '==', uid).get()
        if (guestsSnap.empty) {
            return NextResponse.json({
                display_name: userData.display_name || '',
                avatar_url: userData.avatar_url || null,
                events: [],
                totals: { pivo: 0, redbull: 0, bueno: 0, jagermeister: 0 },
                event_count: 0,
            })
        }

        // Get sessions info
        const sessionsSnap = await db.collection('sessions').get()
        const sessionsMap: Record<string, { name: string; date: string; status: string }> = {}
        sessionsSnap.docs.forEach(doc => {
            const d = doc.data()
            sessionsMap[doc.id] = {
                name: d.name || '',
                date: d.created_at || d.date || '',
                status: d.status || '',
            }
        })

        // Classify products
        const productsSnap = await db.collection('products').get()
        const productCats: Record<string, Set<string>> = { pivo: new Set(), redbull: new Set(), bueno: new Set(), jagermeister: new Set() }
        productsSnap.docs.forEach(doc => {
            const d = doc.data()
            for (const [key, matcher] of Object.entries(PRODUCT_MATCHERS)) {
                if (matcher(d.name || '', d.category || '')) productCats[key].add(doc.id)
            }
        })

        // Fetch consumption for all guest IDs
        const guestIds = guestsSnap.docs.map(d => d.id)
        const guestSessionMap: Record<string, string> = {}
        guestsSnap.docs.forEach(doc => {
            guestSessionMap[doc.id] = doc.data().session_id
        })

        const consumptionBySession: Record<string, Record<string, number>> = {}
        const catKeys = ['pivo', 'redbull', 'bueno', 'jagermeister'] as const

        for (let i = 0; i < guestIds.length; i += 30) {
            const batch = guestIds.slice(i, i + 30)
            if (batch.length === 0) continue
            const snap = await db.collection('consumption').where('guest_id', 'in', batch).get()
            snap.docs.forEach(doc => {
                const d = doc.data()
                const sessionId = guestSessionMap[d.guest_id] || d.session_id
                if (!consumptionBySession[sessionId]) consumptionBySession[sessionId] = { pivo: 0, redbull: 0, bueno: 0, jagermeister: 0 }
                for (const cat of catKeys) {
                    if (productCats[cat].has(d.product_id)) {
                        consumptionBySession[sessionId][cat] += d.quantity || 0
                    }
                }
            })
        }

        // Build events list
        const sessionIds = [...new Set(guestsSnap.docs.map(d => d.data().session_id))]
        const events = sessionIds
            .map(sid => {
                const session = sessionsMap[sid]
                const consumption = consumptionBySession[sid] || { pivo: 0, redbull: 0, bueno: 0, jagermeister: 0 }
                return {
                    name: session?.name || sid,
                    date: session?.date || '',
                    consumption,
                }
            })
            .sort((a, b) => {
                if (!a.date && !b.date) return 0
                if (!a.date) return 1
                if (!b.date) return -1
                return new Date(b.date).getTime() - new Date(a.date).getTime()
            })

        // Totals
        const totals = { pivo: 0, redbull: 0, bueno: 0, jagermeister: 0 }
        for (const cat of catKeys) {
            totals[cat] = events.reduce((sum, e) => sum + (e.consumption[cat] || 0), 0)
        }

        return NextResponse.json({
            display_name: userData.display_name || '',
            avatar_url: userData.avatar_url || null,
            events,
            totals,
            event_count: events.length,
        })
    } catch (error) {
        console.error('Public profile error:', error)
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
}
