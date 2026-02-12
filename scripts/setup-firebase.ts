/**
 * Firebase Setup Script
 * Initializes Firebase Firestore with first session and sample data
 * 
 * Usage: npm run setup:firebase
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

async function setupFirebase() {
  console.log('🔥 Firebase Setup Script')
  console.log('========================\n')

  // Initialize Firebase Admin
  if (!serviceAccountKey || !projectId) {
    console.error('❌ Missing Firebase credentials in .env.local')
    console.error('Required:')
    console.error('  - FIREBASE_SERVICE_ACCOUNT_KEY')
    console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID')
    process.exit(1)
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
        projectId: projectId,
      })
    }
    console.log('✅ Firebase Admin initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error)
    process.exit(1)
  }

  const db = getFirestore()

  // Check if there's already an active session
  console.log('\n📋 Checking for existing sessions...')
  const sessionsSnapshot = await db.collection('sessions')
    .where('is_active', '==', true)
    .limit(1)
    .get()

  if (!sessionsSnapshot.empty) {
    console.log('⚠️  Active session already exists!')
    const existingSession = sessionsSnapshot.docs[0]
    console.log(`   Session: ${existingSession.data().name}`)
    console.log(`   ID: ${existingSession.id}`)
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise<string>((resolve) => {
      readline.question('\nDo you want to create another session anyway? (yes/no): ', resolve)
    })
    readline.close()

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n✅ Setup cancelled. Using existing session.')
      process.exit(0)
    }
  }

  // Create first session
  console.log('\n📅 Creating first session...')
  
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 3) // 3 days event

  const sessionData = {
    name: 'První LAN Party',
    slug: 'prvni-lan-party',
    start_date: Timestamp.fromDate(now),
    end_date: Timestamp.fromDate(endDate),
    price_per_night: 200,
    is_active: true,
    status: 'active',
    description: 'První testovací event v The Nest',
    created_at: Timestamp.now(),
  }

  const sessionRef = await db.collection('sessions').add(sessionData)
  console.log(`✅ Session created with ID: ${sessionRef.id}`)
  console.log(`   Name: ${sessionData.name}`)
  console.log(`   Slug: ${sessionData.slug}`)

  // Create sample products
  console.log('\n🍕 Creating sample products...')
  
  const products = [
    { name: 'Coca Cola 0.5L', price: 25, category: 'Nápoje', is_available: true },
    { name: 'Red Bull', price: 45, category: 'Nápoje', is_available: true },
    { name: 'Pizza Margherita', price: 120, category: 'Jídlo', is_available: true },
    { name: 'Chipsy', price: 35, category: 'Snacky', is_available: true },
    { name: 'Monster Energy', price: 45, category: 'Nápoje', is_available: true },
  ]

  const productIds: string[] = []
  for (const product of products) {
    const productRef = await db.collection('products').add({
      ...product,
      purchase_price: null,
      image_url: null,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
    productIds.push(productRef.id)
    console.log(`   ✓ ${product.name} - ${product.price} Kč`)
  }

  // Create sample hardware items
  console.log('\n🖥️  Creating sample hardware items...')
  
  const hardwareItems = [
    {
      name: 'Monitor 24" Full HD',
      type: 'monitor',
      category: '200',
      price_per_night: 200,
      specs: { resolution: '1920x1080', diagonal: '24"', hz: '144' },
      is_available: true,
    },
    {
      name: 'Gaming PC - RTX 3060',
      type: 'pc',
      category: '250',
      price_per_night: 250,
      specs: { cpu: 'Intel i5', ram: '16GB', gpu: 'RTX 3060' },
      is_available: true,
    },
  ]

  for (const item of hardwareItems) {
    await db.collection('hardware_items').add({
      ...item,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
    console.log(`   ✓ ${item.name} - ${item.price_per_night} Kč/noc`)
  }

  // Create sample guest
  console.log('\n👤 Creating sample guest...')
  
  const guestData = {
    name: 'Test User',
    session_id: sessionRef.id,
    nights_count: 3,
    is_active: true,
    created_at: Timestamp.now(),
  }

  const guestRef = await db.collection('guests').add(guestData)
  console.log(`✅ Guest created: ${guestData.name}`)

  // Create sample consumption
  console.log('\n🍔 Creating sample consumption...')
  
  const consumptionData = {
    guest_id: guestRef.id,
    product_id: productIds[0], // Coca Cola
    session_id: sessionRef.id,
    quantity: 2,
    consumed_at: Timestamp.now(),
  }

  await db.collection('consumption').add(consumptionData)
  console.log(`✅ Consumption record created`)

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('✅ Firebase setup completed successfully!')
  console.log('='.repeat(50))
  console.log('\n📊 Summary:')
  console.log(`   • 1 active session created`)
  console.log(`   • ${products.length} products added`)
  console.log(`   • ${hardwareItems.length} hardware items added`)
  console.log(`   • 1 test guest created`)
  console.log(`   • 1 consumption record created`)
  console.log('\n🚀 You can now start the app with: npm run dev')
  console.log('\n💡 Access the app at: http://localhost:3000')
  console.log('💡 Admin panel at: http://localhost:3000/admin')
}

// Run the setup
setupFirebase()
  .then(() => {
    console.log('\n✅ Setup script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  })

