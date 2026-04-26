import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { ACHIEVEMENTS, computeUserStats } from '@/lib/achievements'

interface CachedRarity {
    expiresAt: number
    payload: {
        totalIdentities: number
        rarity: Record<string, number>
    }
}

const CACHE_TTL_MS = 5 * 60 * 1000

// In-memory cache so repeated profile loads don't trigger a full re-aggregation.
// The aggregation reads every guest, every consumption row and every product —
// expensive enough that a 5-minute TTL is well worth it.
let cache: CachedRarity | null = null

export async function GET() {
    try {
        if (cache && cache.expiresAt > Date.now()) {
            return NextResponse.json(cache.payload)
        }

        const db = getFirebaseAdminDb()

        const [usersSnap, sessionsSnap, guestsSnap, productsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('sessions').get(),
            db.collection('guests').get(),
            db.collection('products').get(),
        ])

        const usersMap: Record<string, { display_name: string }> = {}
        usersSnap.docs.forEach(doc => {
            usersMap[doc.id] = { display_name: doc.data().display_name || '' }
        })

        const sessionsMap: Record<string, { price_per_night: number }> = {}
        sessionsSnap.docs.forEach(doc => {
            const d = doc.data()
            sessionsMap[doc.id] = { price_per_night: d.price_per_night || 0 }
        })

        const productsMap: Record<string, { name: string; category: string; price: number }> = {}
        productsSnap.docs.forEach(doc => {
            const d = doc.data()
            productsMap[doc.id] = { name: d.name || '', category: d.category || '', price: d.price || 0 }
        })

        // Group guests by identity (user_id for registered, normalized name otherwise),
        // matching the convention used by /api/leaderboard.
        interface GuestEntry {
            id: string
            session_id: string
            nights_count: number
            created_at: string
            tip: number
            game_vote_count: number
            consumption: Array<{ product_id: string; quantity: number }>
            hw_total: number
            registration_order: number
        }

        const identities: Record<string, { guests: GuestEntry[] }> = {}

        const guestRecords: Array<{ id: string; identityKey: string; session_id: string; nights_count: number; created_at: string }> = []

        guestsSnap.docs.forEach(doc => {
            const d = doc.data()
            const sessionId = d.session_id
            if (!sessionId) return

            let identityKey: string
            if (d.user_id && usersMap[d.user_id]) {
                identityKey = d.user_id
            } else {
                const name = (d.name || '').trim()
                if (!name) return
                identityKey = 'name:' + name.toLowerCase()
            }

            if (!identities[identityKey]) identities[identityKey] = { guests: [] }
            const createdAt = d.created_at?.toDate?.()?.toISOString() || d.created_at || ''

            identities[identityKey].guests.push({
                id: doc.id,
                session_id: sessionId,
                nights_count: d.nights_count || 1,
                created_at: createdAt,
                tip: 0,
                game_vote_count: 0,
                consumption: [],
                hw_total: 0,
                registration_order: 0,
            })

            guestRecords.push({ id: doc.id, identityKey, session_id: sessionId, nights_count: d.nights_count || 1, created_at: createdAt })
        })

        // Compute registration order per session (1 = first to register)
        const guestsBySession: Record<string, typeof guestRecords> = {}
        for (const g of guestRecords) {
            if (!guestsBySession[g.session_id]) guestsBySession[g.session_id] = []
            guestsBySession[g.session_id].push(g)
        }
        const orderById: Record<string, number> = {}
        for (const [, list] of Object.entries(guestsBySession)) {
            list.sort((a, b) => a.created_at.localeCompare(b.created_at))
            list.forEach((g, idx) => { orderById[g.id] = idx + 1 })
        }

        const idLookup = new Map<string, GuestEntry>()
        for (const ig of Object.values(identities)) {
            for (const g of ig.guests) {
                g.registration_order = orderById[g.id] || 0
                idLookup.set(g.id, g)
            }
        }

        // Bulk-fetch related data (consumption, hardware reservations, tips, game votes)
        // in parallel by collection. Each lookup uses its own pre-built guest map.
        const [consumptionSnap, hwSnap, tipsSnap, votesSnap] = await Promise.all([
            db.collection('consumption').get(),
            db.collection('hardware_reservations').where('status', '==', 'active').get(),
            db.collection('tips').get(),
            db.collection('game_votes').get(),
        ])

        consumptionSnap.docs.forEach(doc => {
            const d = doc.data()
            const guest = idLookup.get(d.guest_id)
            if (!guest) return
            guest.consumption.push({ product_id: d.product_id, quantity: d.quantity || 0 })
        })

        hwSnap.docs.forEach(doc => {
            const d = doc.data()
            const guest = idLookup.get(d.guest_id)
            if (!guest) return
            guest.hw_total += d.total_price || 0
        })

        tipsSnap.docs.forEach(doc => {
            const d = doc.data()
            const guest = idLookup.get(d.guest_id)
            if (!guest) return
            guest.tip += d.amount || 0
        })

        votesSnap.docs.forEach(doc => {
            const d = doc.data()
            const guest = idLookup.get(d.guest_id)
            if (!guest) return
            guest.game_vote_count += 1
        })

        // For each identity, build per-event records that match the shape
        // expected by computeUserStats(), then evaluate every achievement.
        const rarity: Record<string, number> = {}
        for (const a of ACHIEVEMENTS) rarity[a.id] = 0

        let totalIdentities = 0

        for (const identity of Object.values(identities)) {
            const events = identity.guests.map(g => {
                const session = sessionsMap[g.session_id]
                if (!session) return null
                const consumption = g.consumption.map(c => {
                    const product = productsMap[c.product_id]
                    return {
                        name: product?.name || '',
                        category: product?.category || '',
                        qty: c.quantity || 0,
                    }
                })
                const snacksTotal = g.consumption.reduce((sum, c) => {
                    const product = productsMap[c.product_id]
                    return sum + (product?.price || 0) * (c.quantity || 0)
                }, 0)
                const nightsTotal = (g.nights_count || 0) * session.price_per_night
                return {
                    nights_count: g.nights_count || 0,
                    grandTotal: nightsTotal + snacksTotal + g.hw_total + g.tip,
                    tip: g.tip,
                    consumption,
                    registrationOrder: g.registration_order,
                    gameVoteCount: g.game_vote_count,
                }
            }).filter((e): e is NonNullable<typeof e> => e !== null)

            if (events.length === 0) continue
            totalIdentities++

            const stats = computeUserStats(events)
            for (const a of ACHIEVEMENTS) {
                if (a.evaluate(stats).earned) rarity[a.id]++
            }
        }

        const payload = { totalIdentities, rarity }
        cache = { expiresAt: Date.now() + CACHE_TTL_MS, payload }

        return NextResponse.json(payload)
    } catch (error) {
        console.error('Achievements rarity error:', error)
        return NextResponse.json({ error: 'Failed to fetch rarity' }, { status: 500 })
    }
}
