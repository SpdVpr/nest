// Server-side Firebase Admin SDK
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage, Storage } from 'firebase-admin/storage'

let app: App
let db: Firestore
let storage: Storage

export function getFirebaseAdminApp() {
  if (!app) {
    if (getApps().length === 0) {
      // Initialize with service account
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      
      if (serviceAccount) {
        // If service account JSON is provided as string
        app = initializeApp({
          credential: cert(JSON.parse(serviceAccount)),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        })
      } else {
        // Fallback to default credentials (for local development or Cloud Functions)
        app = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        })
      }
    } else {
      app = getApps()[0]
    }
  }
  return app
}

export function getFirebaseAdminDb() {
  if (!db) {
    db = getFirestore(getFirebaseAdminApp())
  }
  return db
}

export function getFirebaseAdminStorage() {
  if (!storage) {
    storage = getStorage(getFirebaseAdminApp())
  }
  return storage
}

