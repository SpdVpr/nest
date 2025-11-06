import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')

  if (!serviceAccount.project_id) {
    console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local')
    process.exit(1)
  }

  initializeApp({
    credential: cert(serviceAccount),
  })
}

const db = getFirestore()

async function setupHardware() {
  console.log('🔧 Starting hardware setup...\n')

  // Monitory - 100 Kč na noc
  const monitors100 = [
    { name: 'MAG 271QPX QD-OLED E2', specs: 'QHD 27" 240Hz', price: 100 },
    { name: 'MAG 271QPX QD-OLED E2', specs: 'QHD 27" 240Hz', price: 100 },
    { name: 'MAG 271QPX QD-OLED E2', specs: 'QHD 27" 240Hz', price: 100 },
    { name: 'MAG 271QPX QD-OLED E2', specs: 'QHD 27" 240Hz', price: 100 },
    { name: 'MAG 271QPX QD-OLED E2', specs: 'QHD 27" 240Hz', price: 100 },
    { name: 'MAG274QRX', specs: 'WQHD 27" 240Hz', price: 100 },
    { name: 'MAG274QRX', specs: 'WQHD 27" 240Hz', price: 100 },
    { name: 'MAG274QRX', specs: 'WQHD 27" 240Hz', price: 100 },
    { name: 'MAG274QRX', specs: 'WQHD 27" 240Hz', price: 100 },
    { name: 'Optix MPG341QR', specs: 'Ultra Wide QHD 34" 144Hz', price: 100 },
    { name: 'Optix MPG341QR', specs: 'Ultra Wide QHD 34" 144Hz', price: 100 },
    { name: 'Optix MPG341QR', specs: 'Ultra Wide QHD 34" 144Hz', price: 100 },
    { name: 'Optix MPG341QR', specs: 'Ultra Wide QHD 34" 144Hz', price: 100 },
    { name: 'Optix MPG341QR', specs: 'Ultra Wide QHD 34" 144Hz', price: 100 },
  ]

  // Monitory - 200 Kč na noc
  const monitors200 = [
    { name: 'MAG274QRF', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF-QD', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF-QD', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF-QD', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF-QD', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG274QRF-QD', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG272QP', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG272QP', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG272QP', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'MAG272QP', specs: 'WQHD 27" 165Hz', price: 200 },
    { name: 'Optix G251PF', specs: 'Full HD 24" 165Hz', price: 200 },
    { name: 'Optix G251PF', specs: 'Full HD 24" 165Hz', price: 200 },
    { name: 'Optix G251PF', specs: 'Full HD 24" 165Hz', price: 200 },
    { name: 'Optix G251PF', specs: 'Full HD 24" 165Hz', price: 200 },
  ]

  // Počítače - 250 Kč na noc
  const computers = [
    { name: 'MSI MAG Infinite S3 #1', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #2', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #3', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #4', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #5', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #6', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #7', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #8', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #9', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #10', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
    { name: 'MSI MAG Infinite S3 #11', specs: 'Intel Core i5 14400F, 32GB, RTX 5070 12GB', price: 250 },
  ]

  let totalCreated = 0

  // Create monitors 100 Kč
  console.log('📺 Creating monitors (100 Kč/night)...')
  for (const monitor of monitors100) {
    await db.collection('hardware_items').add({
      name: monitor.name,
      type: 'monitor',
      category: 'Monitory',
      description: monitor.specs,
      price_per_night: monitor.price,
      is_available: true,
      created_at: Timestamp.now(),
    })
    totalCreated++
  }
  console.log(`✅ Created ${monitors100.length} monitors (100 Kč/night)\n`)

  // Create monitors 200 Kč
  console.log('📺 Creating monitors (200 Kč/night)...')
  for (const monitor of monitors200) {
    await db.collection('hardware_items').add({
      name: monitor.name,
      type: 'monitor',
      category: 'Monitory',
      description: monitor.specs,
      price_per_night: monitor.price,
      is_available: true,
      created_at: Timestamp.now(),
    })
    totalCreated++
  }
  console.log(`✅ Created ${monitors200.length} monitors (200 Kč/night)\n`)

  // Create computers
  console.log('💻 Creating computers (250 Kč/night)...')
  for (const computer of computers) {
    await db.collection('hardware_items').add({
      name: computer.name,
      type: 'pc',
      category: 'Počítače',
      description: computer.specs,
      price_per_night: computer.price,
      is_available: true,
      created_at: Timestamp.now(),
    })
    totalCreated++
  }
  console.log(`✅ Created ${computers.length} computers (250 Kč/night)\n`)

  console.log(`🎉 Hardware setup complete! Created ${totalCreated} items total.`)
  console.log('\nSummary:')
  console.log(`  - ${monitors100.length} monitors @ 100 Kč/night`)
  console.log(`  - ${monitors200.length} monitors @ 200 Kč/night`)
  console.log(`  - ${computers.length} computers @ 250 Kč/night`)
}

setupHardware()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

