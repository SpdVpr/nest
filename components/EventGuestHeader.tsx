'use client'

import { useState, useEffect } from 'react'
import { LogOut, User } from 'lucide-react'
import { guestStorage, StoredGuest } from '@/lib/guest-storage'

interface EventGuestHeaderProps {
  session_slug: string
  onLogout?: () => void
}

export default function EventGuestHeader({ session_slug, onLogout }: EventGuestHeaderProps) {
  const [currentGuest, setCurrentGuest] = useState<StoredGuest | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const guest = guestStorage.getCurrentGuest(session_slug)
    setCurrentGuest(guest)

    // Poll for guest changes (e.g. when user selects a guest on another part of the page)
    const interval = setInterval(() => {
      const g = guestStorage.getCurrentGuest(session_slug)
      setCurrentGuest(prev => {
        if (g?.id !== prev?.id) return g
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [session_slug])

  const handleLogout = () => {
    guestStorage.clearCurrentGuest()
    setCurrentGuest(null)
    onLogout?.()
  }

  if (!mounted) {
    return null
  }

  if (!currentGuest) {
    return null
  }

  return (
    <div className="fixed top-0 right-0 m-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-3 border-2 border-purple-200">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-900">{currentGuest.name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 p-2 hover:bg-gray-100 rounded transition-colors"
          title="Odhlásit se"
        >
          <LogOut className="w-4 h-4 text-gray-600 hover:text-red-600" />
        </button>
      </div>
    </div>
  )
}
