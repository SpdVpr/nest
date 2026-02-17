'use client'

import { useState, useEffect } from 'react'
import { X, Users, UserCheck } from 'lucide-react'
import { Guest } from '@/types/database.types'
import { guestStorage, StoredGuest } from '@/lib/guest-storage'

interface GuestListModalProps {
  guests: Guest[]
  session_slug: string
  isOpen: boolean
  onClose: () => void
  onGuestSelected: (guest: Guest) => void
}

export default function GuestListModal({
  guests,
  session_slug,
  isOpen,
  onClose,
  onGuestSelected
}: GuestListModalProps) {
  const [currentGuest, setCurrentGuest] = useState<StoredGuest | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const guest = guestStorage.getCurrentGuest(session_slug)
    setCurrentGuest(guest)
  }, [session_slug])

  if (!mounted || !isOpen) {
    return null
  }

  const handleGuestSelect = (guest: Guest) => {
    const storedGuest: StoredGuest = {
      id: guest.id,
      name: guest.name,
      session_slug: session_slug
    }
    guestStorage.setCurrentGuest(storedGuest)
    setCurrentGuest(storedGuest)
    onGuestSelected(guest)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#efefef] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Registrovaní uživatelé</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {guests.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <p>Zatím nejsou registrováni žádní uživatelé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {guests.map((guest) => {
                const isCurrentGuest = currentGuest?.id === guest.id
                return (
                  <button
                    key={guest.id}
                    onClick={() => handleGuestSelect(guest)}
                    className={`w-full text-left px-6 py-4 flex items-center justify-between hover:bg-purple-50 transition-colors ${
                      isCurrentGuest ? 'bg-purple-100' : ''
                    }`}
                  >
                    <span className="font-medium text-gray-900">{guest.name}</span>
                    {isCurrentGuest && (
                      <UserCheck className="w-5 h-5 text-green-600" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-lg font-medium transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  )
}
