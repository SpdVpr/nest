// Client-side Firebase client
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth'

function getAuthDomain() {
  const configuredAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

  if (typeof window === 'undefined') {
    return configuredAuthDomain
  }

  const { hostname, host, protocol } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'

  if (protocol !== 'https:' || isLocalhost) {
    return configuredAuthDomain
  }

  return host
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp
let db: Firestore
let storage: FirebaseStorage
let auth: Auth
let authPersistencePromise: Promise<void> | null = null

export function getFirebaseApp() {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  }
  return app
}

export function getFirebaseDb() {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }
  return db
}

export function getFirebaseStorage() {
  if (!storage) {
    storage = getStorage(getFirebaseApp())
  }
  return storage
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
    // Explicitly set persistence — iOS Safari may not default to local persistence
    // due to ITP (Intelligent Tracking Prevention) restrictions
    authPersistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('Firebase auth persistence setup failed:', error)
    })
  }
  return auth
}

export async function ensureFirebaseAuthPersistence() {
  const authInstance = getFirebaseAuth()
  if (authPersistencePromise) {
    await authPersistencePromise
  }
  return authInstance
}
