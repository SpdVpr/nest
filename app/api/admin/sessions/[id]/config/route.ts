// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/config - Get full session config for copying
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const db = getFirebaseAdminDb()

        // Get session
        const sessionDoc = await db.collection('sessions').doc(id).get()
        if (!sessionDoc.exists) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        const session = sessionDoc.data()

        // Get menu items
        const menuSnapshot = await db.collection('sessions').doc(id).collection('menu_items').get()
        const menuItems = menuSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }))

        // Get games
        const gamesSnapshot = await db.collection('games')
            .where('session_id', '==', id)
            .get()
        const games = gamesSnapshot.docs.map(doc => ({
            name: doc.data().name,
        }))

        return NextResponse.json({
            config: {
                price_per_night: session?.price_per_night || 0,
                description: session?.description || '',
                hardware_pricing_enabled: session?.hardware_pricing_enabled !== false,
                hardware_overrides: session?.hardware_overrides || {},
                menu_enabled: session?.menu_enabled || false,
                menu_items: menuItems,
                games: games,
            }
        })
    } catch (error) {
        console.error('Error fetching session config:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
