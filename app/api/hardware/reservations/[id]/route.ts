// @ts-nocheck
import { NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const docRef = db.collection('hardware_reservations').doc(id)
    await docRef.update({
      status,
      updated_at: Timestamp.now(),
    })

    const updatedDoc = await docRef.get()
    const data = updatedDoc.data()

    return NextResponse.json({
      reservation: {
        id: updatedDoc.id,
        ...data,
        created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
        updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at,
      }
    })
  } catch (error) {
    console.error('Error in reservation PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirebaseAdminDb()
    const { id } = await params

    await db.collection('hardware_reservations').doc(id).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reservation DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}