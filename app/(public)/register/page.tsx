'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to /snacks
    router.replace('/snacks')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin text-6xl mb-4">🔄</div>
        <p className="text-gray-600">Přesměrovávám na občerstvení...</p>
      </div>
    </div>
  )
}