import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { getGuestsByUserId, getSessionById, getProductById } from '@/lib/firebase/queries'

// GET /api/auth/history - Get full event history for authenticated user
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        const decodedToken = await auth.verifyIdToken(token)

        const guests = await getGuestsByUserId(decodedToken.uid)
        if (guests.length === 0) {
            return NextResponse.json({ events: [] })
        }

        const db = getFirebaseAdminDb()

        const events = await Promise.all(
            guests.map(async (guest) => {
                const session = await getSessionById(guest.session_id)
                if (!session) return null

                // Fetch all data for this guest in parallel
                const [
                    consumptionSnap,
                    hwReservationsSnap,
                    seatReservationsSnap,
                    tipsSnap,
                    gameVotesSnap,
                    settlementSnap,
                ] = await Promise.all([
                    db.collection('consumption')
                        .where('guest_id', '==', guest.id)
                        .where('session_id', '==', session.id)
                        .get(),
                    db.collection('hardware_reservations')
                        .where('guest_id', '==', guest.id)
                        .where('session_id', '==', session.id)
                        .where('status', '==', 'active')
                        .get(),
                    db.collection('seat_reservations')
                        .where('guest_id', '==', guest.id)
                        .where('session_id', '==', session.id)
                        .get(),
                    db.collection('tips')
                        .where('guest_id', '==', guest.id)
                        .where('session_id', '==', session.id)
                        .limit(1)
                        .get(),
                    db.collection('game_votes')
                        .where('guest_id', '==', guest.id)
                        .where('session_id', '==', session.id)
                        .get(),
                    db.collection('settlements')
                        .where('guest_id', '==', guest.id)
                        .where('session_id', '==', session.id)
                        .limit(1)
                        .get(),
                ])

                // Process consumption — group by product
                const consumptionByProduct: Record<string, { name: string; category: string; qty: number; unitPrice: number; totalPrice: number }> = {}
                let snacksTotal = 0

                await Promise.all(
                    consumptionSnap.docs.map(async (doc) => {
                        const data = doc.data()
                        const product = await getProductById(data.product_id)
                        const qty = data.quantity || 0
                        const unitPrice = data.unit_price !== undefined ? data.unit_price : (product?.price || 0)
                        const total = qty * unitPrice
                        const name = product?.name || 'Neznámé'

                        if (!consumptionByProduct[name]) {
                            consumptionByProduct[name] = {
                                name,
                                category: product?.category || 'Ostatní',
                                qty: 0,
                                unitPrice,
                                totalPrice: 0,
                            }
                        }
                        consumptionByProduct[name].qty += qty
                        consumptionByProduct[name].totalPrice += total
                        snacksTotal += total
                    })
                )

                // Process hardware
                const hardware: { name: string; type: string; qty: number; totalPrice: number }[] = []
                let hwTotal = 0
                const hardwarePricingEnabled = session.hardware_pricing_enabled !== false

                await Promise.all(
                    hwReservationsSnap.docs.map(async (doc) => {
                        const data = doc.data()
                        const hwDoc = await db.collection('hardware_items').doc(data.hardware_item_id).get()
                        const hwData = hwDoc.exists ? hwDoc.data() : null
                        const price = hardwarePricingEnabled ? (data.total_price || 0) : 0

                        hardware.push({
                            name: hwData?.name || 'Neznámý HW',
                            type: hwData?.type || 'other',
                            qty: data.quantity || 1,
                            totalPrice: price,
                        })
                        hwTotal += price
                    })
                )

                // Process seats
                const seats = seatReservationsSnap.docs
                    .filter(doc => !doc.data().auto_reserved)
                    .map(doc => doc.data().seat_id as string)

                // Process tip
                const tipDoc = tipsSnap.docs[0]
                const tip = tipDoc ? (tipDoc.data().amount || 0) : 0

                // Process game votes count
                const gameVoteCount = gameVotesSnap.size

                // Process settlement
                const settlementDoc = settlementSnap.docs[0]
                const settlement = settlementDoc ? {
                    status: settlementDoc.data().status || 'draft',
                    paid_at: settlementDoc.data().paid_at || null,
                } : null

                // Calculate accommodation
                const nightsCount = guest.nights_count || 1
                const pricePerNight = session.price_per_night || 0
                const nightsTotal = nightsCount * pricePerNight

                const grandTotal = nightsTotal + snacksTotal + hwTotal + tip

                // Calculate registration order (was this guest the Nth to register?)
                let registrationOrder = 0
                try {
                    const earlierGuestsSnap = await db.collection('guests')
                        .where('session_id', '==', session.id)
                        .where('is_active', '==', true)
                        .get()
                    const guestCreatedAt = guest.created_at || ''
                    registrationOrder = earlierGuestsSnap.docs
                        .filter(d => {
                            const ca = d.data().created_at?.toDate?.()?.toISOString() || d.data().created_at || ''
                            return ca < guestCreatedAt
                        }).length + 1
                } catch { }

                return {
                    session: {
                        id: session.id,
                        name: session.name,
                        slug: session.slug,
                        start_date: session.start_date,
                        end_date: session.end_date,
                        status: session.status,
                    },
                    guest: {
                        id: guest.id,
                        name: guest.name,
                        nights_count: nightsCount,
                        check_in_date: guest.check_in_date,
                        check_out_date: guest.check_out_date,
                        deposit: guest.deposit || 0,
                    },
                    consumption: Object.values(consumptionByProduct).sort((a, b) => a.category.localeCompare(b.category)),
                    snacksTotal,
                    hardware: hardware.sort((a, b) => {
                        const order = (t: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2
                        return order(a.type) - order(b.type)
                    }),
                    hwTotal,
                    seats,
                    tip,
                    gameVoteCount,
                    nightsTotal,
                    grandTotal,
                    settlement,
                    registrationOrder,
                }
            })
        )

        // Filter nulls (sessions that no longer exist) and sort newest first
        const validEvents = events
            .filter(Boolean)
            .sort((a: any, b: any) => b.session.start_date.localeCompare(a.session.start_date))

        return NextResponse.json({ events: validEvents })
    } catch (error: any) {
        console.error('Auth history error:', error)
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }
}
