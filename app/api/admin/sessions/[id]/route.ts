// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// GET /api/admin/sessions/[id] - Get session detail
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

    const doc = await db.collection('sessions').doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const session = {
      id: doc.id,
      ...doc.data(),
      start_date: doc.data()?.start_date?.toDate?.()?.toISOString() || doc.data()?.start_date,
      end_date: doc.data()?.end_date?.toDate?.()?.toISOString() || doc.data()?.end_date,
      created_at: doc.data()?.created_at?.toDate?.()?.toISOString() || doc.data()?.created_at,
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/sessions/[id] - Update session
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
    console.log('Updating session with data:', body)

    const db = getFirebaseAdminDb()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.start_date !== undefined) {
      updateData.start_date = body.start_date ? new Date(body.start_date) : null
    }
    if (body.end_date !== undefined) {
      updateData.end_date = body.end_date ? new Date(body.end_date) : null
    }
    if (body.description !== undefined) {
      updateData.description = body.description || null
    }
    if (body.start_time !== undefined) {
      updateData.start_time = body.start_time || null
    }
    if (body.end_time !== undefined) {
      updateData.end_time = body.end_time || null
    }
    if (body.price_per_night !== undefined) {
      const price = parseFloat(body.price_per_night)
      if (isNaN(price)) {
        return NextResponse.json(
          { error: 'Invalid price_per_night value' },
          { status: 400 }
        )
      }
      updateData.price_per_night = price
    }
    if (body.menu_enabled !== undefined) {
      updateData.menu_enabled = Boolean(body.menu_enabled)
    }
    if (body.hardware_pricing_enabled !== undefined) {
      updateData.hardware_pricing_enabled = Boolean(body.hardware_pricing_enabled)
    }
    if (body.hardware_overrides !== undefined) {
      updateData.hardware_overrides = body.hardware_overrides || {}
    }
    if (body.surcharge_enabled !== undefined) {
      updateData.surcharge_enabled = Boolean(body.surcharge_enabled)
    }
    if (body.hardware_enabled !== undefined) {
      updateData.hardware_enabled = Boolean(body.hardware_enabled)
    }
    if (body.seats_enabled !== undefined) {
      updateData.seats_enabled = Boolean(body.seats_enabled)
    }
    if (body.top_products !== undefined) {
      updateData.top_products = Array.isArray(body.top_products) ? body.top_products : []
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No data to update' },
        { status: 400 }
      )
    }

    console.log('Sending to database:', updateData)

    const docRef = db.collection('sessions').doc(id)
    await docRef.update(updateData)

    const updatedDoc = await docRef.get()
    const session = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      start_date: updatedDoc.data()?.start_date?.toDate?.()?.toISOString() || updatedDoc.data()?.start_date,
      end_date: updatedDoc.data()?.end_date?.toDate?.()?.toISOString() || updatedDoc.data()?.end_date,
      created_at: updatedDoc.data()?.created_at?.toDate?.()?.toISOString() || updatedDoc.data()?.created_at,
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/sessions/[id] - Delete session
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

    await db.collection('sessions').doc(id).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}