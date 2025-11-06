// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  return token === process.env.ADMIN_PASSWORD
}

// PATCH /api/admin/products/[id] - Update product
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

    const updateData: any = {
      updated_at: Timestamp.now()
    }
    if (body.name !== undefined) updateData.name = body.name
    if (body.price !== undefined) updateData.price = parseFloat(body.price)
    if (body.category !== undefined) updateData.category = body.category
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.is_available !== undefined) updateData.is_available = body.is_available

    await db.collection('products').doc(id).update(updateData)

    const updatedDoc = await db.collection('products').doc(id).get()

    if (!updatedDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      created_at: updatedDoc.data()?.created_at?.toDate?.()?.toISOString() || updatedDoc.data()?.created_at,
      updated_at: updatedDoc.data()?.updated_at?.toDate?.()?.toISOString() || updatedDoc.data()?.updated_at,
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products/[id] - Delete product
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

    // Get product to delete image from storage
    const productDoc = await db.collection('products').doc(id).get()

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productData = productDoc.data()

    // Delete image from Firebase Storage if exists
    if (productData?.image_url) {
      try {
        const { getStorage } = await import('firebase-admin/storage')
        const bucket = getStorage().bucket()

        // Extract file path from URL
        // URL format: https://storage.googleapis.com/{bucket}/{path}
        const urlParts = productData.image_url.split(`${bucket.name}/`)
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await bucket.file(filePath).delete()
        }
      } catch (storageError) {
        console.error('Error deleting image from storage:', storageError)
        // Continue with product deletion even if image deletion fails
      }
    }

    // Delete product
    await db.collection('products').doc(id).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}

// GET /api/admin/products/[id] - Get single product
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

    const productDoc = await db.collection('products').doc(id).get()

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = {
      id: productDoc.id,
      ...productDoc.data(),
      created_at: productDoc.data()?.created_at?.toDate?.()?.toISOString() || productDoc.data()?.created_at,
      updated_at: productDoc.data()?.updated_at?.toDate?.()?.toISOString() || productDoc.data()?.updated_at,
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}