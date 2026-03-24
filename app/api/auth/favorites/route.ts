import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminApp, getFirebaseAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { getGuestsByUserId } from '@/lib/firebase/queries'

// GET /api/auth/favorites - Get user's top consumed products across all events
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getFirebaseAdminApp()
        const auth = getAuth(app)
        const decodedToken = await auth.verifyIdToken(token)

        const guests = await getGuestsByUserId(decodedToken.uid)
        if (guests.length === 0) {
            return NextResponse.json({ favorites: [] })
        }

        const db = getFirebaseAdminDb()

        // Fetch all consumption for all guest IDs
        const productCounts: Record<string, number> = {}
        await Promise.all(
            guests.map(async (guest) => {
                const snap = await db.collection('consumption')
                    .where('guest_id', '==', guest.id)
                    .get()
                snap.docs.forEach(doc => {
                    const data = doc.data()
                    const pid = data.product_id
                    const qty = data.quantity || 0
                    productCounts[pid] = (productCounts[pid] || 0) + qty
                })
            })
        )

        // Sort by count, take top 8
        const sorted = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)

        // Fetch product details
        const favorites = await Promise.all(
            sorted.map(async ([productId, count]) => {
                const doc = await db.collection('products').doc(productId).get()
                if (!doc.exists) return null
                const data = doc.data()!
                return {
                    product_id: productId,
                    name: data.name,
                    price: data.price,
                    category: data.category,
                    image_url: data.image_url,
                    total_count: count,
                }
            })
        )

        return NextResponse.json({ favorites: favorites.filter(Boolean) })
    } catch (error: any) {
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        console.error('Favorites error:', error)
        return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }
}
