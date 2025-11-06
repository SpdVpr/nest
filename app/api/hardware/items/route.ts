import { NextResponse } from 'next/server'
import { getAllHardwareItems } from '@/lib/firebase/queries'

export async function GET() {
  try {
    const items = await getAllHardwareItems()
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error in hardware items API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}