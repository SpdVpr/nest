import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getSessionBySlug } from '@/lib/firebase/queries'

// GET /api/event/[slug]/tips - Get all tips for a session
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

        const tipsSnapshot = await db.collection('tips')
            .where('session_id', '==', session.id)
            .get()

        const tips: Record<string, { amount: number; percentage: number | null; updated_at: string }> = {}
        tipsSnapshot.docs.forEach(doc => {
            const data = doc.data()
            tips[data.guest_id] = {
                amount: data.amount || 0,
                percentage: data.percentage ?? null,
                updated_at: data.updated_at || data.created_at || '',
            }
        })

        return NextResponse.json({ tips })
    } catch (error) {
        console.error('Error fetching tips:', error)
        return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 })
    }
}

// POST /api/event/[slug]/tips - Save or update a tip for a guest
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { guest_id, amount, percentage } = body

        if (!guest_id || amount === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const tipAmount = Math.max(0, Math.round(Number(amount)))

        const db = getFirebaseAdminDb()

        const session = await getSessionBySlug(slug)
        if (!session) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        }

        // Check if tip already exists for this guest + session
        const existingTip = await db.collection('tips')
            .where('session_id', '==', session.id)
            .where('guest_id', '==', guest_id)
            .limit(1)
            .get()

        if (!existingTip.empty) {
            // Update existing tip
            const docRef = existingTip.docs[0].ref
            await docRef.update({
                amount: tipAmount,
                percentage: percentage ?? null,
                updated_at: new Date().toISOString(),
            })
        } else {
            // Create new tip
            await db.collection('tips').add({
                session_id: session.id,
                guest_id,
                amount: tipAmount,
                percentage: percentage ?? null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
        }

        return NextResponse.json({ success: true, amount: tipAmount })
    } catch (error) {
        console.error('Error saving tip:', error)
        return NextResponse.json({ error: 'Failed to save tip' }, { status: 500 })
    }
}
