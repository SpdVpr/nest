// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

// GET /api/game-library - Get all available games from the global library (public)
export async function GET(request: NextRequest) {
    try {
        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('game_library').get()

        const games = snapshot.docs
            .map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    name: data.name,
                    category: data.category || null,
                    max_players: data.max_players || null,
                    is_available: data.is_available ?? true,
                }
            })
            .filter(g => g.is_available)
            .sort((a, b) => a.name.localeCompare(b.name))

        return NextResponse.json({ games })
    } catch (error) {
        console.error('Error fetching game library:', error)
        return NextResponse.json({ error: 'Failed to fetch game library' }, { status: 500 })
    }
}
