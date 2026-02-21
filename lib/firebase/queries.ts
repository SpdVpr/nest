// Common Firestore query helpers
import { getFirebaseAdminDb } from './admin'
import { Timestamp } from 'firebase-admin/firestore'
import type { DocumentData } from 'firebase-admin/firestore'
import { Session, Guest, Product, HardwareItem } from '@/types/database.types'

/**
 * Convert Firestore document to typed object with proper date handling
 */
function docToObject<T>(docData: DocumentData, docId: string): T {
  const data: any = { ...docData, id: docId }

  // Convert Timestamp fields to ISO strings
  Object.keys(data).forEach(key => {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate().toISOString()
    }
  })

  return data as T
}

/**
 * Get the active session
 */
export async function getActiveSession(): Promise<Session | null> {
  const db = getFirebaseAdminDb()
  const snapshot = await db.collection('sessions')
    .where('is_active', '==', true)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return docToObject<Session>(doc.data(), doc.id)
}

/**
 * Get session by ID
 */
export async function getSessionById(sessionId: string): Promise<Session | null> {
  const db = getFirebaseAdminDb()
  const sessionDoc = await db.collection('sessions').doc(sessionId).get()

  if (!sessionDoc.exists) {
    return null
  }

  return docToObject<Session>(sessionDoc.data()!, sessionDoc.id)
}

/**
 * Get session by slug
 */
export async function getSessionBySlug(slug: string): Promise<Session | null> {
  const db = getFirebaseAdminDb()
  const snapshot = await db.collection('sessions')
    .where('slug', '==', slug)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  return docToObject<Session>(doc.data(), doc.id)
}

/**
 * Get guests by session ID
 */
export async function getGuestsBySessionId(sessionId: string, activeOnly: boolean = true): Promise<Guest[]> {
  const db = getFirebaseAdminDb()
  let query = db.collection('guests')
    .where('session_id', '==', sessionId)

  if (activeOnly) {
    query = query.where('is_active', '==', true)
  }

  const snapshot = await query.get()

  // Sort in memory instead of using orderBy (to avoid complex composite index)
  const guests = snapshot.docs.map(doc => docToObject<Guest>(doc.data(), doc.id))
  return guests.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get guest by ID
 */
export async function getGuestById(guestId: string): Promise<Guest | null> {
  const db = getFirebaseAdminDb()
  const guestDoc = await db.collection('guests').doc(guestId).get()

  if (!guestDoc.exists) {
    return null
  }

  return docToObject<Guest>(guestDoc.data()!, guestDoc.id)
}

/**
 * Get all available products
 */
export async function getAvailableProducts(): Promise<Product[]> {
  const db = getFirebaseAdminDb()
  const snapshot = await db.collection('products')
    .where('is_available', '==', true)
    .get()

  // Sort in memory to avoid composite index requirement
  const products = snapshot.docs.map(doc => docToObject<Product>(doc.data(), doc.id))
  return products.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get all products (including unavailable)
 */
export async function getAllProducts(): Promise<Product[]> {
  const db = getFirebaseAdminDb()
  const snapshot = await db.collection('products')
    .get()

  // Sort in memory to avoid index requirement
  const products = snapshot.docs.map(doc => docToObject<Product>(doc.data(), doc.id))
  return products.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  const db = getFirebaseAdminDb()
  const productDoc = await db.collection('products').doc(productId).get()

  if (!productDoc.exists) {
    return null
  }

  return docToObject<Product>(productDoc.data()!, productDoc.id)
}

/**
 * Get all hardware items
 */
export async function getAllHardwareItems(): Promise<HardwareItem[]> {
  const db = getFirebaseAdminDb()
  const snapshot = await db.collection('hardware_items').get()

  const items = snapshot.docs.map(doc => {
    const item = docToObject<HardwareItem>(doc.data(), doc.id)
    return { ...item, quantity: item.quantity || 1 }
  })

  // Sort by sort_order first, then category, then name
  return items.sort((a, b) => {
    const orderA = a.sort_order ?? 999
    const orderB = b.sort_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare
    return a.name.localeCompare(b.name)
  })
}

/**
 * Get available hardware items
 */
export async function getAvailableHardwareItems(): Promise<HardwareItem[]> {
  const db = getFirebaseAdminDb()
  const snapshot = await db.collection('hardware_items')
    .where('is_available', '==', true)
    .get()

  const items = snapshot.docs.map(doc => docToObject<HardwareItem>(doc.data(), doc.id))

  // Sort by sort_order first, then category, then name
  return items.sort((a, b) => {
    const orderA = a.sort_order ?? 999
    const orderB = b.sort_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare
    return a.name.localeCompare(b.name)
  })
}

/**
 * Get hardware item by ID
 */
export async function getHardwareItemById(itemId: string): Promise<HardwareItem | null> {
  const db = getFirebaseAdminDb()
  const itemDoc = await db.collection('hardware_items').doc(itemId).get()

  if (!itemDoc.exists) {
    return null
  }

  return docToObject<HardwareItem>(itemDoc.data()!, itemDoc.id)
}

