import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { verifyAdminRequest } from '@/lib/verify-admin'
import { getGuestsByUserId, getSessionById, getProductById } from '@/lib/firebase/queries'

// GET /api/admin/registered-users/history?uid=xxx - Get full event history for a user (admin only)
export async function GET(request: NextRequest) {
    const admin = await verifyAdminRequest(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uid = request.nextUrl.searchParams.get('uid')
    if (!uid) {
        return NextResponse.json({ error: 'uid required' }, { status: 400 })
    }

    try {
        const guests = await getGuestsByUserId(uid)
        if (guests.length === 0) {
            return NextResponse.json({ events: [] })
        }

        const db = getFirebaseAdminDb()

        const events = await Promise.all(
            guests.map(async (guest) => {
                const session = await getSessionById(guest.session_id)
                if (!session) return null

                const [consumptionSnap, hwSnap, seatSnap, tipsSnap, votesSnap, settlementSnap] = await Promise.all([
                    db.collection('consumption').where('guest_id', '==', guest.id).where('session_id', '==', session.id).get(),
                    db.collection('hardware_reservations').where('guest_id', '==', guest.id).where('session_id', '==', session.id).where('status', '==', 'active').get(),
                    db.collection('seat_reservations').where('guest_id', '==', guest.id).where('session_id', '==', session.id).get(),
                    db.collection('tips').where('guest_id', '==', guest.id).where('session_id', '==', session.id).limit(1).get(),
                    db.collection('game_votes').where('guest_id', '==', guest.id).where('session_id', '==', session.id).get(),
                    db.collection('settlements').where('guest_id', '==', guest.id).where('session_id', '==', session.id).limit(1).get(),
                ])

                // Consumption
                const consumptionByProduct: Record<string, { name: string; category: string; qty: number; unitPrice: number; totalPrice: number }> = {}
                let snacksTotal = 0
                await Promise.all(consumptionSnap.docs.map(async (doc) => {
                    const d = doc.data()
                    const product = await getProductById(d.product_id)
                    const qty = d.quantity || 0
                    const unitPrice = d.unit_price !== undefined ? d.unit_price : (product?.price || 0)
                    const total = qty * unitPrice
                    const name = product?.name || 'Neznámé'
                    if (!consumptionByProduct[name]) consumptionByProduct[name] = { name, category: product?.category || 'Ostatní', qty: 0, unitPrice, totalPrice: 0 }
                    consumptionByProduct[name].qty += qty
                    consumptionByProduct[name].totalPrice += total
                    snacksTotal += total
                }))

                // Hardware
                const hardware: { name: string; type: string; qty: number; totalPrice: number }[] = []
                let hwTotal = 0
                const hwPricingEnabled = session.hardware_pricing_enabled !== false
                await Promise.all(hwSnap.docs.map(async (doc) => {
                    const d = doc.data()
                    const hwDoc = await db.collection('hardware_items').doc(d.hardware_item_id).get()
                    const hwData = hwDoc.exists ? hwDoc.data() : null
                    const price = hwPricingEnabled ? (d.total_price || 0) : 0
                    hardware.push({ name: hwData?.name || 'Neznámý HW', type: hwData?.type || 'other', qty: d.quantity || 1, totalPrice: price })
                    hwTotal += price
                }))

                const seats = seatSnap.docs.filter(d => !d.data().auto_reserved).map(d => d.data().seat_id as string)
                const tip = tipsSnap.docs[0] ? (tipsSnap.docs[0].data().amount || 0) : 0
                const nightsTotal = (guest.nights_count || 1) * (session.price_per_night || 0)
                const settlementDoc = settlementSnap.docs[0]

                return {
                    session: { id: session.id, name: session.name, slug: session.slug, start_date: session.start_date, end_date: session.end_date, status: session.status },
                    guest: { id: guest.id, name: guest.name, nights_count: guest.nights_count || 1, check_in_date: guest.check_in_date, check_out_date: guest.check_out_date, deposit: guest.deposit || 0 },
                    consumption: Object.values(consumptionByProduct).sort((a, b) => a.category.localeCompare(b.category)),
                    snacksTotal,
                    hardware: hardware.sort((a, b) => { const o = (t: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2; return o(a.type) - o(b.type) }),
                    hwTotal,
                    seats,
                    tip,
                    gameVoteCount: votesSnap.size,
                    nightsTotal,
                    grandTotal: nightsTotal + snacksTotal + hwTotal + tip,
                    settlement: settlementDoc ? { status: settlementDoc.data().status || 'draft', paid_at: settlementDoc.data().paid_at || null } : null,
                }
            })
        )

        return NextResponse.json({
            events: events.filter(Boolean).sort((a: any, b: any) => b.session.start_date.localeCompare(a.session.start_date)),
        })
    } catch (error) {
        console.error('Error fetching user history:', error)
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }
}
