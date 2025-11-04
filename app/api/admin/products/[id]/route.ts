// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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
    
    const supabase = createAdminClient()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.price !== undefined) updateData.price = body.price
    if (body.category !== undefined) updateData.category = body.category
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.is_available !== undefined) updateData.is_available = body.is_available

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id' as any, id)
      .select()
      .single()

    if (error) throw error

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
    const supabase = createAdminClient()

    // Get product to delete image from storage
    const { data: product } = await supabase
      .from('products')
      .select('image_url')
      .eq('id' as any, id)
      .single()

    // Delete image from storage if exists
    if (product?.image_url) {
      const fileName = product.image_url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('product-images')
          .remove([fileName])
      }
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id' as any, id)

    if (error) throw error

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
    const supabase = createAdminClient()

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id' as any, id)
      .single()

    if (error) throw error

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}