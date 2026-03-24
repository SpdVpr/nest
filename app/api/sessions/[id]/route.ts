import { NextRequest, NextResponse } from 'next/server'
import { getSessionById } from '@/lib/firebase/queries'

// GET /api/sessions/[id] - Get session by ID (lightweight, public)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getSessionById(id)

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        return NextResponse.json({
            session: {
                id: session.id,
                name: session.name,
                slug: session.slug,
                start_date: session.start_date,
                end_date: session.end_date,
                start_time: session.start_time,
                end_time: session.end_time,
                status: session.status,
            }
        })
    } catch (error) {
        console.error('Error fetching session:', error)
        return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
    }
}
