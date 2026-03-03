// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAllHardwareItems } from '@/lib/firebase/queries'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/full - Get ALL data for session detail page in one request
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: sessionId } = await context.params
        const db = getFirebaseAdminDb()

        // Fetch session first (needed for slug)
        const sessionDoc = await db.collection('sessions').doc(sessionId).get()
        if (!sessionDoc.exists) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        const sessionData = sessionDoc.data()
        const session = {
            id: sessionDoc.id,
            ...sessionData,
            start_date: sessionData?.start_date?.toDate?.()?.toISOString() || sessionData?.start_date,
            end_date: sessionData?.end_date?.toDate?.()?.toISOString() || sessionData?.end_date,
            created_at: sessionData?.created_at?.toDate?.()?.toISOString() || sessionData?.created_at,
        }

        // Fire ALL queries in parallel - this is the key optimization
        const [
            guestsSnapshot,
            consumptionSnapshot,
            reservationsSnapshot,
            gamesSnapshot,
            votesSnapshot,
            menuSnapshot,
            gameLibrarySnapshot,
            installRequestsSnapshot,
            seatReservationsSnapshot,
            hardwareItems,
            tipsSnapshot,
        ] = await Promise.all([
            // Guests for this session
            db.collection('guests')
                .where('session_id', '==', sessionId)
                .where('is_active', '==', true)
                .get(),
            // Consumption for this session
            db.collection('consumption')
                .where('session_id', '==', sessionId)
                .get(),
            // Hardware reservations
            db.collection('hardware_reservations')
                .where('session_id', '==', sessionId)
                .get(),
            // Games for this session
            db.collection('games')
                .where('session_id', '==', sessionId)
                .get(),
            // Game votes
            db.collection('game_votes')
                .where('session_id', '==', sessionId)
                .get(),
            // Menu items
            db.collection('menu_items')
                .where('session_id', '==', sessionId)
                .get(),
            // Global game library
            db.collection('game_library')
                .orderBy('name', 'asc')
                .get(),
            // Game install requests
            db.collection('game_install_requests')
                .where('session_id', '==', sessionId)
                .get(),
            // Seat reservations
            db.collection('seat_reservations')
                .where('session_id', '==', sessionId)
                .get(),
            // Hardware items (uses query helper)
            getAllHardwareItems(),
            // Tips
            db.collection('tips')
                .where('session_id', '==', sessionId)
                .get(),
        ])

        // --- Process products for consumption (batch fetch) ---
        const productIds = new Set<string>()
        consumptionSnapshot.docs.forEach(doc => {
            const pid = doc.data().product_id
            if (pid) productIds.add(pid)
        })

        const productsMap = new Map<string, any>()
        if (productIds.size > 0) {
            const productRefs = Array.from(productIds).map(id => db.collection('products').doc(id))
            const productDocs = await db.getAll(...productRefs)
            productDocs.forEach(doc => {
                if (doc.exists) {
                    productsMap.set(doc.id, {
                        id: doc.id,
                        name: doc.data()?.name,
                        price: doc.data()?.price,
                        category: doc.data()?.category,
                    })
                }
            })
        }

        // --- Process guests with consumption ---
        const consumptionByGuest = new Map<string, any[]>()
        consumptionSnapshot.docs.forEach(doc => {
            const data = doc.data()
            const guestId = data.guest_id
            if (!consumptionByGuest.has(guestId)) {
                consumptionByGuest.set(guestId, [])
            }
            consumptionByGuest.get(guestId)!.push({
                id: doc.id,
                quantity: data.quantity || 0,
                consumed_at: data.consumed_at?.toDate?.()?.toISOString() || data.consumed_at,
                products: data.product_id ? productsMap.get(data.product_id) || null : null,
            })
        })

        const guests = guestsSnapshot.docs.map(doc => {
            const data = doc.data()
            const guestConsumption = consumptionByGuest.get(doc.id) || []

            const totalBeers = guestConsumption
                .filter(c => c.products?.category?.toLowerCase().includes('pivo'))
                .reduce((sum, c) => sum + (c.quantity || 0), 0)

            const totalItems = guestConsumption
                .filter(c => !c.products?.category?.toLowerCase().includes('pivo'))
                .reduce((sum, c) => sum + (c.quantity || 0), 0)

            const totalPrice = guestConsumption.reduce(
                (sum, c) => sum + ((c.quantity || 0) * (c.products?.price || 0)),
                0
            )

            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
                check_in_date: data.check_in_date?.toDate?.()?.toISOString() || null,
                check_out_date: data.check_out_date?.toDate?.()?.toISOString() || null,
                totalItems,
                totalPrice,
                totalBeers,
                consumption: guestConsumption,
            }
        }).sort((a, b) => a.name.localeCompare(b.name))

        // --- Process consumption (flat list for the consumption tab) ---
        const consumption = consumptionSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                consumed_at: data.consumed_at?.toDate?.()?.toISOString() || data.consumed_at,
                products: data.product_id ? productsMap.get(data.product_id) || null : null,
            }
        }).sort((a, b) => {
            const dateA = new Date(a.consumed_at).getTime()
            const dateB = new Date(b.consumed_at).getTime()
            return dateB - dateA
        })

        // --- Process reservations ---
        const reservations = reservationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data()?.created_at?.toDate?.()?.toISOString() || doc.data()?.created_at,
            updated_at: doc.data()?.updated_at?.toDate?.()?.toISOString() || doc.data()?.updated_at,
        }))

        // --- Process games ---
        const games = gamesSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        }).sort((a, b) => {
            if (a.is_admin_pick !== b.is_admin_pick) return a.is_admin_pick ? -1 : 1
            return (b.votes || 0) - (a.votes || 0)
        })

        const votes = votesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }))

        // --- Process menu ---
        const menuItems = menuSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        }).sort((a, b) => {
            if (a.day_index !== b.day_index) return a.day_index - b.day_index
            return (a.order || 0) - (b.order || 0)
        })

        // --- Process game library ---
        const libraryGames = gameLibrarySnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
                updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
            }
        })

        // --- Process game install requests ---
        const gameInstallRequests = installRequestsSnapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        })

        // --- Process seat reservations ---
        const seatReservations = seatReservationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            auto_reserved: doc.data().auto_reserved || false,
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        })).sort((a, b) => {
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return dateA - dateB
        })

        // --- Process tips ---
        const tips: Record<string, { amount: number; percentage: number | null; updated_at: string }> = {}
        tipsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            if (data.guest_id) {
                tips[data.guest_id] = {
                    amount: data.amount || 0,
                    percentage: data.percentage ?? null,
                    updated_at: data.updated_at || data.created_at || '',
                }
            }
        })

        // --- Prepared state (already in session doc) ---
        const hwPrepared = sessionData?.hw_prepared || {}
        const gamesPrepared = sessionData?.games_prepared || {}

        return NextResponse.json({
            session,
            guests,
            consumption,
            reservations,
            games,
            votes,
            menuItems,
            menuEnabled: session.menu_enabled || false,
            libraryGames,
            gameInstallRequests,
            seatReservations,
            hardwareItems,
            tips,
            hwPrepared,
            gamesPrepared,
        })
    } catch (error) {
        console.error('Error fetching full session data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch session data', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
