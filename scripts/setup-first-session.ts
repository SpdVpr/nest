/**
 * Setup First Session Script
 * Creates the first active LAN party session if it doesn't exist
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function setupFirstSession() {
  console.log('🔍 Checking Supabase connection...')
  console.log('URL:', supabaseUrl)

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Test connection
    console.log('\n📡 Testing connection...')
    const { data: testData, error: testError } = await supabase
      .from('sessions')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('❌ Connection failed:', testError.message)
      process.exit(1)
    }

    console.log('✅ Connection successful!')

    // Check for active session
    console.log('\n🔍 Checking for active session...')
    const { data: activeSession, error: activeError } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (activeError) {
      console.error('❌ Error checking sessions:', activeError.message)
      process.exit(1)
    }

    if (activeSession) {
      console.log('✅ Active session already exists:')
      console.log('   ID:', activeSession.id)
      console.log('   Name:', activeSession.name)
      console.log('   Started:', new Date(activeSession.start_date).toLocaleString('cs-CZ'))
      console.log('\n🎉 Everything is ready!')
    } else {
      console.log('⚠️  No active session found. Creating first session...')

      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          name: 'První LAN Party',
          is_active: true,
          start_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Failed to create session:', createError.message)
        process.exit(1)
      }

      console.log('✅ First session created successfully!')
      console.log('   ID:', newSession.id)
      console.log('   Name:', newSession.name)
      console.log('\n🎉 Setup complete! You can now register guests.')
    }

    // Show summary
    console.log('\n📊 Database Summary:')
    const { count: sessionsCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
    
    const { count: guestsCount } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
    
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    console.log(`   Sessions: ${sessionsCount || 0}`)
    console.log(`   Guests: ${guestsCount || 0}`)
    console.log(`   Products: ${productsCount || 0}`)

    console.log('\n✅ All done! Your app is ready to use.')
    console.log('   👉 Start with: npm run dev')
    console.log('   👉 Open: http://localhost:3000')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

setupFirstSession()