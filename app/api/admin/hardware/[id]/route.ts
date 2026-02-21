// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/hardware/[id] - Get single hardware item
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

    const doc = await db.collection('hardware_items').doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Hardware item not found' }, { status: 404 })
    }

    const item = {
      id: doc.id,
      ...doc.data(),
      created_at: doc.data()?.created_at?.toDate?.()?.toISOString(),
      updated_at: doc.data()?.updated_at?.toDate?.()?.toISOString(),
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error fetching hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hardware item' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/hardware/[id] - Update hardware item
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const db = getFirebaseAdminDb()
    const { Timestamp } = await import('firebase-admin/firestore')

    const updateData: any = {
      updated_at: Timestamp.now()
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type
    if (body.category !== undefined) updateData.category = body.category
    if (body.price_per_night !== undefined) updateData.price_per_night = parseFloat(body.price_per_night)
    if (body.quantity !== undefined) updateData.quantity = parseInt(body.quantity)
    if (body.is_available !== undefined) updateData.is_available = body.is_available
    if (body.specs !== undefined) updateData.specs = body.specs
    if (body.sort_order !== undefined) updateData.sort_order = parseInt(body.sort_order)

    await db.collection('hardware_items').doc(id).update(updateData)

    const updatedDoc = await db.collection('hardware_items').doc(id).get()
    const item = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      created_at: updatedDoc.data()?.created_at?.toDate?.()?.toISOString(),
      updated_at: updatedDoc.data()?.updated_at?.toDate?.()?.toISOString(),
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to update hardware item' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/hardware/[id] - Delete hardware item
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const db = getFirebaseAdminDb()

    // Delete hardware item
    await db.collection('hardware_items').doc(id).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hardware item:', error)
    return NextResponse.json(
      { error: 'Failed to delete hardware item' },
      { status: 500 }
    )
  }
}