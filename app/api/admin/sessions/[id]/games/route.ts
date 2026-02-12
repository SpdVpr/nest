// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id]/games - Get all games for session
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

        // Fetch games
        const gamesSnap = await db.collection('games')
            .where('session_id', '==', id)
            .get()

        const games = gamesSnap.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        })

        // Fetch votes
        const votesSnap = await db.collection('game_votes')
            .where('session_id', '==', id)
            .get()

        const votes = votesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }))

        // Sort: admin picks first, then by votes desc
        games.sort((a: any, b: any) => {
            if (a.is_admin_pick !== b.is_admin_pick) return a.is_admin_pick ? -1 : 1
            return (b.votes || 0) - (a.votes || 0)
        })

        return NextResponse.json({ games, votes })
    } catch (error) {
        console.error('Error fetching games:', error)
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }
}

// POST /api/admin/sessions/[id]/games - Create admin game
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const body = await request.json()
        const { name } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const now = Timestamp.now()

        const gameData = {
            session_id: id,
            name: name.trim(),
            is_admin_pick: true,
            votes: 0,
            created_at: now,
        }

        const docRef = await db.collection('games').add(gameData)

        return NextResponse.json({
            game: {
                id: docRef.id,
                ...gameData,
                created_at: now.toDate().toISOString(),
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating game:', error)
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
}

// DELETE /api/admin/sessions/[id]/games - Delete a game
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const { searchParams } = new URL(request.url)
        const gameId = searchParams.get('gameId')

        if (!gameId) {
            return NextResponse.json({ error: 'gameId is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()

        // Delete the game
        await db.collection('games').doc(gameId).delete()

        // Delete associated votes
        const votesSnap = await db.collection('game_votes')
            .where('game_id', '==', gameId)
            .get()

        const batch = db.batch()
        votesSnap.docs.forEach(doc => batch.delete(doc.ref))
        if (votesSnap.docs.length > 0) await batch.commit()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting game:', error)
        return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
    }
}
