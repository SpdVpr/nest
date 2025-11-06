import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { Product } from '@/types/database.types'

// GET /api/products - Get all available products
export async function GET() {
  try {
    const db = getFirebaseAdminDb()
    const productsRef = db.collection('products')
    const snapshot = await productsRef
      .where('is_available', '==', true)
      .get()

    // Sort in memory to avoid composite index requirement
    const products: Product[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString(),
      updated_at: doc.data().updated_at?.toDate().toISOString() || new Date().toISOString(),
    })) as Product[]

    products.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, price, category, image_url, is_available } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    const db = getFirebaseAdminDb()
    const productsRef = db.collection('products')

    const now = Timestamp.now()
    const productData = {
      name: name.trim(),
      price,
      category: category?.trim() || null,
      image_url: image_url || null,
      is_available: is_available ?? true,
      purchase_price: null,
      created_at: now,
      updated_at: now,
    }

    const docRef = await productsRef.add(productData)
    const product: Product = {
      id: docRef.id,
      ...productData,
      created_at: now.toDate().toISOString(),
      updated_at: now.toDate().toISOString(),
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}