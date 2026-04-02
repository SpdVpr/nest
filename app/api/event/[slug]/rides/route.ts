// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

// GET /api/event/[slug]/rides - Get rides for event
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

        // Fetch rides
        const ridesSnap = await db.collection('rides')
            .where('session_id', '==', sessionId)
            .get()

        const rides = ridesSnap.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
            }
        })

        // Fetch all passengers for this session
        const passengersSnap = await db.collection('ride_passengers')
            .where('session_id', '==', sessionId)
            .get()

        const passengers = passengersSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
        }))

        // Sort rides by departure_date, then departure_time
        rides.sort((a, b) => {
            const dateCompare = a.departure_date.localeCompare(b.departure_date)
            if (dateCompare !== 0) return dateCompare
            return a.departure_time.localeCompare(b.departure_time)
        })

        return NextResponse.json({ rides, passengers })
    } catch (error) {
        console.error('Error fetching rides:', error)
        return NextResponse.json({ error: 'Failed to fetch rides' }, { status: 500 })
    }
}

// POST /api/event/[slug]/rides - Create, join, leave, or delete a ride
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { action, guest_id } = body

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

        if (action === 'create') {
            const { departure_date, departure_time, origin, total_seats, driver_name } = body

            if (!departure_date || !departure_time || !origin?.trim() || !total_seats || !driver_name?.trim()) {
                return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
            }

            if (total_seats < 1 || total_seats > 8) {
                return NextResponse.json({ error: 'Seats must be between 1 and 8' }, { status: 400 })
            }

            const rideData = {
                session_id: sessionId,
                driver_guest_id: guest_id,
                driver_name: driver_name.trim(),
                departure_date,
                departure_time,
                origin: origin.trim(),
                total_seats,
                created_at: now,
            }

            const docRef = await db.collection('rides').add(rideData)

            return NextResponse.json({
                ride: {
                    id: docRef.id,
                    ...rideData,
                    created_at: now.toDate().toISOString(),
                }
            }, { status: 201 })
        }

        if (action === 'join') {
            const { ride_id, guest_name } = body

            if (!ride_id || !guest_name?.trim()) {
                return NextResponse.json({ error: 'ride_id and guest_name are required' }, { status: 400 })
            }

            // Check ride exists
            const rideDoc = await db.collection('rides').doc(ride_id).get()
            if (!rideDoc.exists) {
                return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
            }

            const rideData = rideDoc.data()

            // Check not the driver
            if (rideData.driver_guest_id === guest_id) {
                return NextResponse.json({ error: 'Driver cannot join their own ride' }, { status: 400 })
            }

            // Check not already a passenger
            const existingPassenger = await db.collection('ride_passengers')
                .where('ride_id', '==', ride_id)
                .where('guest_id', '==', guest_id)
                .limit(1)
                .get()

            if (!existingPassenger.empty) {
                return NextResponse.json({ error: 'Already joined this ride' }, { status: 400 })
            }

            // Check seats available
            const passengersSnap = await db.collection('ride_passengers')
                .where('ride_id', '==', ride_id)
                .get()

            if (passengersSnap.size >= rideData.total_seats) {
                return NextResponse.json({ error: 'No seats available' }, { status: 400 })
            }

            await db.collection('ride_passengers').add({
                ride_id,
                guest_id,
                guest_name: guest_name.trim(),
                session_id: sessionId,
                created_at: now,
            })

            // Notify driver if they have a Firebase account
            try {
                const driverGuestSnap = await db.collection('guests').doc(rideData.driver_guest_id).get()
                const driverUserId = driverGuestSnap.exists ? driverGuestSnap.data()?.user_id : null
                if (driverUserId) {
                    await db.collection('notifications').add({
                        user_id: driverUserId,
                        type: 'ride_join',
                        title: 'Spolujezdec přidán',
                        body: `${guest_name.trim()} se připojil/a k tvé jízdě (${rideData.origin}, ${rideData.departure_time})`,
                        session_id: sessionId,
                        is_read: false,
                        created_at: now,
                    })
                }
            } catch (notifError) {
                console.error('Error sending ride notification:', notifError)
            }

            return NextResponse.json({ joined: true })
        }

        if (action === 'leave') {
            const { ride_id } = body

            if (!ride_id) {
                return NextResponse.json({ error: 'ride_id is required' }, { status: 400 })
            }

            const passengerSnap = await db.collection('ride_passengers')
                .where('ride_id', '==', ride_id)
                .where('guest_id', '==', guest_id)
                .limit(1)
                .get()

            if (passengerSnap.empty) {
                return NextResponse.json({ error: 'Not a passenger' }, { status: 400 })
            }

            await passengerSnap.docs[0].ref.delete()

            return NextResponse.json({ left: true })
        }

        if (action === 'delete') {
            const { ride_id } = body

            if (!ride_id) {
                return NextResponse.json({ error: 'ride_id is required' }, { status: 400 })
            }

            // Check ride exists and is owned by this guest
            const rideDoc = await db.collection('rides').doc(ride_id).get()
            if (!rideDoc.exists) {
                return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
            }

            if (rideDoc.data().driver_guest_id !== guest_id) {
                return NextResponse.json({ error: 'Only the driver can delete this ride' }, { status: 403 })
            }

            // Delete all passengers first
            const passengersSnap = await db.collection('ride_passengers')
                .where('ride_id', '==', ride_id)
                .get()

            const batch = db.batch()
            passengersSnap.docs.forEach(doc => batch.delete(doc.ref))
            batch.delete(db.collection('rides').doc(ride_id))
            await batch.commit()

            return NextResponse.json({ deleted: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Error with ride action:', error)
        return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
    }
}
