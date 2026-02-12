// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

// GET /api/event/[slug]/games - Get games for event (public)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const db = getFirebaseAdminDb()

        // Find session by slug
        const sessionSnapshot = await db.collection('sessions')
            .where('slug', '==', slug)
            .limit(1)
            .get()

        if (sessionSnapshot.empty) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const sessionId = sessionSnapshot.docs[0].id

        // Fetch games
        const gamesSnap = await db.collection('games')
            .where('session_id', '==', sessionId)
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
            .where('session_id', '==', sessionId)
            .get()

        const votes = votesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }))

        // Sort: admin picks first, then by votes desc, then by name
        games.sort((a, b) => {
            if (a.is_admin_pick !== b.is_admin_pick) return a.is_admin_pick ? -1 : 1
            if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0)
            return a.name.localeCompare(b.name)
        })

        return NextResponse.json({ games, votes })
    } catch (error) {
        console.error('Error fetching games:', error)
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }
}

// POST /api/event/[slug]/games - Suggest a game or vote
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { action, guest_id, game_id, name } = body

        if (!guest_id) {
            return NextResponse.json({ error: 'guest_id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()

        // Find session
        const sessionSnapshot = await db.collection('sessions')
            .where('slug', '==', slug)
            .limit(1)
            .get()

        if (sessionSnapshot.empty) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        const sessionId = sessionSnapshot.docs[0].id
        const now = Timestamp.now()

        if (action === 'suggest') {
            // Suggest a new game
            if (!name?.trim()) {
                return NextResponse.json({ error: 'Name is required' }, { status: 400 })
            }

            const gameData = {
                session_id: sessionId,
                name: name.trim(),
                suggested_by: guest_id,
                is_admin_pick: false,
                votes: 1, // auto-vote for your own suggestion
                created_at: now,
            }

            const docRef = await db.collection('games').add(gameData)

            // Auto-vote for the suggesting guest
            await db.collection('game_votes').add({
                game_id: docRef.id,
                guest_id,
                session_id: sessionId,
                created_at: now,
            })

            return NextResponse.json({
                game: {
                    id: docRef.id,
                    ...gameData,
                    created_at: now.toDate().toISOString(),
                }
            }, { status: 201 })
        }

        if (action === 'vote') {
            if (!game_id) {
                return NextResponse.json({ error: 'game_id is required' }, { status: 400 })
            }

            // Check if already voted
            const existingVote = await db.collection('game_votes')
                .where('game_id', '==', game_id)
                .where('guest_id', '==', guest_id)
                .limit(1)
                .get()

            if (!existingVote.empty) {
                // Remove vote (toggle)
                await existingVote.docs[0].ref.delete()

                // Decrement vote count
                const gameRef = db.collection('games').doc(game_id)
                const gameDoc = await gameRef.get()
                if (gameDoc.exists) {
                    const currentVotes = gameDoc.data()?.votes || 0
                    await gameRef.update({ votes: Math.max(0, currentVotes - 1) })
                }

                return NextResponse.json({ voted: false })
            } else {
                // Add vote
                await db.collection('game_votes').add({
                    game_id,
                    guest_id,
                    session_id: sessionId,
                    created_at: now,
                })

                // Increment vote count
                const gameRef = db.collection('games').doc(game_id)
                const gameDoc = await gameRef.get()
                if (gameDoc.exists) {
                    const currentVotes = gameDoc.data()?.votes || 0
                    await gameRef.update({ votes: currentVotes + 1 })
                }

                return NextResponse.json({ voted: true })
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Error with game action:', error)
        return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
    }
}
