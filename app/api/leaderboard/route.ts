import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

const PRODUCT_MATCHERS: Record<string, (name: string, category: string) => boolean> = {
    pivo: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('pivo') || l.includes('beer') || l.includes('plzeň') || l.includes('pilsner') || l.includes('lager') || l.includes('kozel') || l.includes('staropramen') || l.includes('budvar') || l.includes('gambrinus') },
    redbull: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('red bull') || l.includes('redbull') },
    bueno: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('bueno') || l.includes('kinder') },
    jagermeister: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('jäger') || l.includes('jager') || l.includes('jägermeister') || l.includes('jagermeister') },
}

interface RankEntry {
    uid: string
    display_name: string
    avatar_url: string | null
    value: number
    event_name?: string
    is_registered?: boolean
}

export async function GET() {
    try {
        const db = getFirebaseAdminDb()

        // 1. Users (registered)
        const usersSnap = await db.collection('users').get()
        const usersMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
        usersSnap.docs.forEach(doc => {
            const d = doc.data()
            usersMap[doc.id] = { display_name: d.display_name || '', avatar_url: d.avatar_url || null }
        })

        // 2. Sessions
        const sessionsSnap = await db.collection('sessions').get()
        const sessionsMap: Record<string, string> = {}
        sessionsSnap.docs.forEach(doc => sessionsMap[doc.id] = doc.data().name || '')

        // 3. ALL guests (not just claimed ones)
        const guestsSnap = await db.collection('guests').get()

        // Group guests by identity: registered user_id, or by normalized name for unregistered
        // Key: user_id for registered, "name:lowercased_name" for unregistered
        const identityGuests: Record<string, {
            display_name: string
            avatar_url: string | null
            is_registered: boolean
            guests: Array<{ id: string; session_id: string }>
        }> = {}

        guestsSnap.docs.forEach(doc => {
            const d = doc.data()
            const sessionId = d.session_id
            if (!sessionId) return

            let identityKey: string
            if (d.user_id && usersMap[d.user_id]) {
                // Registered user — group by user_id
                identityKey = d.user_id
                if (!identityGuests[identityKey]) {
                    identityGuests[identityKey] = {
                        display_name: usersMap[d.user_id].display_name,
                        avatar_url: usersMap[d.user_id].avatar_url,
                        is_registered: true,
                        guests: [],
                    }
                }
            } else {
                // Unregistered guest — group by normalized name
                const name = (d.name || '').trim()
                if (!name) return
                identityKey = 'name:' + name.toLowerCase()
                if (!identityGuests[identityKey]) {
                    identityGuests[identityKey] = {
                        display_name: name,
                        avatar_url: null,
                        is_registered: false,
                        guests: [],
                    }
                }
            }

            identityGuests[identityKey].guests.push({ id: doc.id, session_id: sessionId })
        })

        // 4. Consumption — fetch in batches
        const allGuestIds = Object.values(identityGuests).flatMap(ig => ig.guests.map(g => g.id))
        const consumptionByGuest: Record<string, Array<{ product_id: string; quantity: number; session_id: string }>> = {}
        for (let i = 0; i < allGuestIds.length; i += 30) {
            const batch = allGuestIds.slice(i, i + 30)
            if (batch.length === 0) continue
            const snap = await db.collection('consumption').where('guest_id', 'in', batch).get()
            snap.docs.forEach(doc => {
                const d = doc.data()
                if (!consumptionByGuest[d.guest_id]) consumptionByGuest[d.guest_id] = []
                consumptionByGuest[d.guest_id].push({ product_id: d.product_id, quantity: d.quantity || 0, session_id: d.session_id })
            })
        }

        // 5. Classify products
        const productsSnap = await db.collection('products').get()
        const productCats: Record<string, Set<string>> = { pivo: new Set(), redbull: new Set(), bueno: new Set(), jagermeister: new Set() }
        productsSnap.docs.forEach(doc => {
            const d = doc.data()
            for (const [key, matcher] of Object.entries(PRODUCT_MATCHERS)) {
                if (matcher(d.name || '', d.category || '')) productCats[key].add(doc.id)
            }
        })

        // 6. Compute stats per identity
        const catKeys = ['pivo', 'redbull', 'bueno', 'jagermeister'] as const

        const totalStats: Record<string, { attendance: number } & Record<string, number>> = {}
        const bestEventStats: Record<string, Record<string, { value: number; session_id: string }>> = {}

        for (const [identityKey, identity] of Object.entries(identityGuests)) {
            const sessions = new Set(identity.guests.map(g => g.session_id))
            totalStats[identityKey] = { attendance: sessions.size, pivo: 0, redbull: 0, bueno: 0, jagermeister: 0 }
            bestEventStats[identityKey] = {}
            for (const cat of catKeys) bestEventStats[identityKey][cat] = { value: 0, session_id: '' }

            const perEvent: Record<string, Record<string, number>> = {}

            for (const guest of identity.guests) {
                const consumption = consumptionByGuest[guest.id] || []
                for (const c of consumption) {
                    for (const cat of catKeys) {
                        if (productCats[cat].has(c.product_id)) {
                            totalStats[identityKey][cat] += c.quantity

                            if (!perEvent[guest.session_id]) perEvent[guest.session_id] = {}
                            if (!perEvent[guest.session_id][cat]) perEvent[guest.session_id][cat] = 0
                            perEvent[guest.session_id][cat] += c.quantity
                        }
                    }
                }
            }

            for (const [sessionId, cats] of Object.entries(perEvent)) {
                for (const cat of catKeys) {
                    if ((cats[cat] || 0) > bestEventStats[identityKey][cat].value) {
                        bestEventStats[identityKey][cat] = { value: cats[cat] || 0, session_id: sessionId }
                    }
                }
            }
        }

        // 7. Build rankings
        const identityKeys = Object.keys(totalStats)

        const buildRanking = (getValue: (key: string) => number, getExtra?: (key: string) => { event_name?: string }): RankEntry[] =>
            identityKeys
                .map(key => ({
                    uid: key,
                    display_name: identityGuests[key]?.display_name || '',
                    avatar_url: identityGuests[key]?.avatar_url || null,
                    value: getValue(key),
                    is_registered: identityGuests[key]?.is_registered || false,
                    ...(getExtra ? getExtra(key) : {}),
                }))
                .filter(e => e.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, 20)

        const result = {
            total: {
                attendance: buildRanking(key => totalStats[key].attendance),
                pivo: buildRanking(key => totalStats[key].pivo),
                redbull: buildRanking(key => totalStats[key].redbull),
                bueno: buildRanking(key => totalStats[key].bueno),
                jagermeister: buildRanking(key => totalStats[key].jagermeister),
            },
            best_event: {
                pivo: buildRanking(
                    key => bestEventStats[key]?.pivo?.value || 0,
                    key => ({ event_name: sessionsMap[bestEventStats[key]?.pivo?.session_id] || '' })
                ),
                redbull: buildRanking(
                    key => bestEventStats[key]?.redbull?.value || 0,
                    key => ({ event_name: sessionsMap[bestEventStats[key]?.redbull?.session_id] || '' })
                ),
                bueno: buildRanking(
                    key => bestEventStats[key]?.bueno?.value || 0,
                    key => ({ event_name: sessionsMap[bestEventStats[key]?.bueno?.session_id] || '' })
                ),
                jagermeister: buildRanking(
                    key => bestEventStats[key]?.jagermeister?.value || 0,
                    key => ({ event_name: sessionsMap[bestEventStats[key]?.jagermeister?.session_id] || '' })
                ),
            },
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Leaderboard error:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}
