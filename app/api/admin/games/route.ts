// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/games - Get all games from global library
export async function GET(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = getFirebaseAdminDb()
        const snapshot = await db.collection('game_library')
            .orderBy('name', 'asc')
            .get()

        const games = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
                updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
            }
        })

        return NextResponse.json({ games })
    } catch (error) {
        console.error('Error fetching game library:', error)
        return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }
}

// POST /api/admin/games - Add a game to the global library
export async function POST(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, category, max_players, notes } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const now = Timestamp.now()

        const gameData = {
            name: name.trim(),
            category: category?.trim() || null,
            max_players: max_players || null,
            image_url: null,
            notes: notes?.trim() || null,
            is_available: true,
            created_at: now,
            updated_at: now,
        }

        const docRef = await db.collection('game_library').add(gameData)

        return NextResponse.json({
            game: {
                id: docRef.id,
                ...gameData,
                created_at: now.toDate().toISOString(),
                updated_at: now.toDate().toISOString(),
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating game:', error)
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }
}

// PATCH /api/admin/games - Update a game in the global library
export async function PATCH(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        const docRef = db.collection('game_library').doc(id)
        const doc = await docRef.get()

        if (!doc.exists) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 })
        }

        const updateData: any = {
            updated_at: Timestamp.now(),
        }

        if (updates.name !== undefined) updateData.name = updates.name.trim()
        if (updates.category !== undefined) updateData.category = updates.category?.trim() || null
        if (updates.max_players !== undefined) updateData.max_players = updates.max_players || null
        if (updates.notes !== undefined) updateData.notes = updates.notes?.trim() || null
        if (updates.is_available !== undefined) updateData.is_available = updates.is_available

        await docRef.update(updateData)

        const updated = await docRef.get()
        const data = updated.data()

        return NextResponse.json({
            game: {
                id: updated.id,
                ...data,
                created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
                updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at,
            }
        })
    } catch (error) {
        console.error('Error updating game:', error)
        return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
    }
}

// DELETE /api/admin/games - Delete a game from the global library
export async function DELETE(request: NextRequest) {
    try {
        if (!verifyAuth(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const gameId = searchParams.get('id')

        if (!gameId) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const db = getFirebaseAdminDb()
        await db.collection('game_library').doc(gameId).delete()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting game:', error)
        return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
    }
}
