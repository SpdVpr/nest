import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getSessionBySlug, getProductById } from '@/lib/firebase/queries'

// GET /api/event/[slug]/costs - Get cost summary for all guests
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const db = getFirebaseAdminDb()

        const session = await getSessionBySlug(slug)
        if (!session) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Get guests for this session
        const guestsSnapshot = await db.collection('guests')
            .where('session_id', '==', session.id)
            .where('is_active', '==', true)
            .get()

        // Get all hardware reservations for this session
        const hwReservationsSnapshot = await db.collection('hardware_reservations')
            .where('session_id', '==', session.id)
            .where('status', '==', 'active')
            .get()

        // Get all tips for this session
        const tipsSnapshot = await db.collection('tips')
            .where('session_id', '==', session.id)
            .get()

        const tipsMap: Record<string, { amount: number; percentage: number | null }> = {}
        tipsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            tipsMap[data.guest_id] = {
                amount: data.amount || 0,
                percentage: data.percentage ?? null,
            }
        })

        // Get all settlements for this session
        const settlementsSnapshot = await db.collection('settlements')
            .where('session_id', '==', session.id)
            .get()

        const settlementsMap: Record<string, any> = {}
        settlementsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            settlementsMap[data.guest_id] = {
                status: data.status || 'draft',
                qr_generated_at: data.qr_generated_at || null,
                variable_symbol: data.variable_symbol || null,
                overrides: data.overrides || {},
                custom_items: data.custom_items || [],
                adjustments: data.adjustments || [],
                paid_at: data.paid_at || null,
            }
        })

        // Get bank settings (non-sensitive fields only)
        const settingsDoc = await db.collection('admin_settings').doc('general').get()
        const settingsData = settingsDoc.exists ? settingsDoc.data() : null
        const bankSettings = settingsData ? {
            bank_account: settingsData.bank_account || '',
            bank_iban: settingsData.bank_iban || '',
            account_holder: settingsData.account_holder || '',
        } : null

        // Build hardware reservations map
        const hwByGuest: Record<string, { name: string; qty: number; totalPrice: number; type: string }[]> = {}
        await Promise.all(
            hwReservationsSnapshot.docs.map(async (doc) => {
                const data = doc.data()
                const guestId = data.guest_id
                if (!hwByGuest[guestId]) hwByGuest[guestId] = []

                const hwDoc = await db.collection('hardware_items').doc(data.hardware_item_id).get()
                const hwData = hwDoc.exists ? hwDoc.data() : null

                hwByGuest[guestId].push({
                    name: hwData?.name || 'Neznámý HW',
                    qty: data.quantity || 1,
                    totalPrice: data.total_price || 0,
                    type: hwData?.type || 'other',
                })
            })
        )

        // Build per-guest cost summary
        const guestCosts = await Promise.all(
            guestsSnapshot.docs.map(async (guestDoc) => {
                const guestData = guestDoc.data()
                const guestId = guestDoc.id

                // Get consumption
                const consumptionSnapshot = await db.collection('consumption')
                    .where('guest_id', '==', guestId)
                    .get()

                const consumptionItems: { name: string; category: string; qty: number; unitPrice: number; totalPrice: number }[] = []
                let snacksTotal = 0

                await Promise.all(
                    consumptionSnapshot.docs.map(async (consDoc) => {
                        const consData = consDoc.data()
                        const product = await getProductById(consData.product_id)
                        const qty = consData.quantity || 0
                        const unitPrice = product?.price || 0
                        const total = qty * unitPrice

                        consumptionItems.push({
                            name: product?.name || 'Neznámé',
                            category: product?.category || 'Ostatní',
                            qty,
                            unitPrice,
                            totalPrice: total,
                        })

                        snacksTotal += total
                    })
                )

                // Group consumption by product name
                const groupedConsumption: Record<string, { name: string; category: string; qty: number; unitPrice: number; totalPrice: number }> = {}
                consumptionItems.forEach(item => {
                    if (!groupedConsumption[item.name]) {
                        groupedConsumption[item.name] = { ...item }
                    } else {
                        groupedConsumption[item.name].qty += item.qty
                        groupedConsumption[item.name].totalPrice += item.totalPrice
                    }
                })

                // Hardware costs — respect hardware_pricing_enabled
                const hwItems = hwByGuest[guestId] || []
                const hardwarePricingEnabled = (session as any).hardware_pricing_enabled !== false
                const hwTotal = hardwarePricingEnabled
                    ? hwItems.reduce((sum, item) => sum + item.totalPrice, 0)
                    : 0

                // Tip
                const tip = tipsMap[guestId] || { amount: 0, percentage: null }

                // Accommodation cost with dynamic pricing
                const nightsCount = guestData.nights_count || 1
                const basePricePerNight = (session as any).price_per_night || 0
                const isSurchargeEnabled = (session as any).surcharge_enabled === true
                const totalGuests = guestsSnapshot.size
                const missingGuests = isSurchargeEnabled ? Math.max(0, 10 - totalGuests) : 0
                const surchargePerNight = missingGuests * 150
                const effectivePricePerNight = basePricePerNight + surchargePerNight
                const pricePerNight = effectivePricePerNight
                const nightsTotal = nightsCount * pricePerNight

                // Settlement data for this guest
                const settlement = settlementsMap[guestId] || null

                // Calculate final total with overrides and custom items (same logic as admin)
                let finalTotal = nightsTotal + snacksTotal + hwTotal + tip.amount
                if (settlement && settlement.qr_generated_at) {
                    const overrides = settlement.overrides || {}
                    const nightsVal = 'accommodation' in overrides ? overrides['accommodation'] : nightsTotal
                    const tipVal = 'tip' in overrides ? overrides['tip'] : tip.amount

                    let consumptionVal = 0
                    const consumptionArr = Object.values(groupedConsumption).sort((a: any, b: any) => a.category.localeCompare(b.category))
                    consumptionArr.forEach((item: any, idx: number) => {
                        const key = `consumption-${idx}`
                        consumptionVal += key in overrides ? overrides[key] : item.totalPrice
                    })

                    let hardwareVal = 0
                    const hwSorted = hwItems.sort((a, b) => {
                        const order = (t: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2
                        return order(a.type) - order(b.type)
                    })
                    hwSorted.forEach((item, idx) => {
                        const key = `hardware-${idx}`
                        hardwareVal += key in overrides ? overrides[key] : item.totalPrice
                    })

                    const customItemsVal = (settlement.custom_items || []).reduce((sum: number, ci: any) => sum + (ci.amount || 0), 0)
                    const adjustmentsVal = (settlement.adjustments || []).reduce((sum: number, adj: any) => sum + (adj.amount || 0), 0)

                    finalTotal = Math.max(0, nightsVal + consumptionVal + hardwareVal + tipVal + customItemsVal + adjustmentsVal)
                }

                return {
                    id: guestId,
                    name: guestData.name,
                    nights_count: nightsCount,
                    nightsTotal,
                    consumption: Object.values(groupedConsumption).sort((a, b) => a.category.localeCompare(b.category)),
                    snacksTotal,
                    hardware: hwItems.sort((a, b) => {
                        const order = (t: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2
                        return order(a.type) - order(b.type)
                    }),
                    hwTotal,
                    tip: tip.amount,
                    tipPercentage: tip.percentage,
                    grandTotal: nightsTotal + snacksTotal + hwTotal + tip.amount,
                    // Settlement info (only when QR has been generated by admin)
                    settlement: settlement && settlement.qr_generated_at ? {
                        status: settlement.status,
                        qr_generated_at: settlement.qr_generated_at,
                        variable_symbol: settlement.variable_symbol,
                        paid_at: settlement.paid_at,
                        finalTotal,
                    } : null,
                }
            })
        )

        // Sort by name
        guestCosts.sort((a, b) => a.name.localeCompare(b.name))

        // Check if any guest has settlement data
        const hasAnySettlement = guestCosts.some(g => g.settlement !== null)

        // Calculate effective price for the response
        const basePPN = (session as any).price_per_night || 0
        const surchargeOn = (session as any).surcharge_enabled === true
        const totalGuestsCount = guestsSnapshot.size
        const missingGuestsCount = surchargeOn ? Math.max(0, 10 - totalGuestsCount) : 0
        const effectivePPN = basePPN + missingGuestsCount * 150

        return NextResponse.json({
            guests: guestCosts,
            sessionName: session.name,
            pricePerNight: basePPN,
            effectivePricePerNight: effectivePPN,
            surchargeEnabled: surchargeOn,
            guestCount: totalGuestsCount,
            hardwarePricingEnabled: (session as any).hardware_pricing_enabled !== false,
            isPreliminary: !hasAnySettlement,
            bankSettings: hasAnySettlement ? bankSettings : null,
        })
    } catch (error) {
        console.error('Error fetching costs:', error)
        return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 })
    }
}
