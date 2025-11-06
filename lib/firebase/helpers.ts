// Helper functions for Firestore operations
import { 
  DocumentData, 
  QueryDocumentSnapshot, 
  Timestamp,
  serverTimestamp,
  FieldValue 
} from 'firebase/firestore'

/**
 * Convert Firestore document to plain object with id
 */
export function docToData<T = DocumentData>(doc: QueryDocumentSnapshot): T & { id: string } {
  return {
    id: doc.id,
    ...doc.data(),
  } as T & { id: string }
}

/**
 * Convert Firestore Timestamp to ISO string
 */
export function timestampToString(timestamp: Timestamp | FieldValue | undefined): string | null {
  if (!timestamp || timestamp instanceof FieldValue) return null
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  return null
}

/**
 * Convert ISO string to Firestore Timestamp
 */
export function stringToTimestamp(dateString: string | null | undefined): Timestamp | null {
  if (!dateString) return null
  return Timestamp.fromDate(new Date(dateString))
}

/**
 * Get server timestamp for Firestore
 */
export function getServerTimestamp() {
  return serverTimestamp()
}

/**
 * Convert Firestore document data to include proper date formatting
 */
export function formatDocData<T extends DocumentData>(data: T): any {
  const formatted: any = { ...data }

  // Convert Timestamp fields to ISO strings
  Object.keys(formatted).forEach(key => {
    const value = formatted[key]
    if (value instanceof Timestamp) {
      formatted[key] = value.toDate().toISOString()
    }
  })

  return formatted as T
}

