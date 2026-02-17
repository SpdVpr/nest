'use client'

import { useState, useEffect } from 'react'
import { X, User, UserPlus } from 'lucide-react'
import { Guest } from '@/types/database.types'
import { guestStorage } from '@/lib/guest-storage'

interface GuestSelectionModalProps {
  guests: Guest[]
  session_slug: string
  isOpen: boolean
  onGuestSelected: (guest: Guest) => void
  onRegisterNew?: () => void
}

export default function GuestSelectionModal({
  guests,
  session_slug,
  isOpen,
  onGuestSelected,
  onRegisterNew
}: GuestSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isOpen) {
    return null
  }

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleGuestSelect = (guest: Guest) => {
    guestStorage.setCurrentGuest({
      id: guest.id,
      name: guest.name,
      session_slug: session_slug
    })
    onGuestSelected(guest)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#efefef] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Vyber svého hosta</h2>
          </div>
          <p className="text-sm text-gray-600">
            Pro pokračování si vyber své jméno ze seznamu
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Hledat jméno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Guest List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Žádný host nenalezen' : 'Žádní hosté'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => handleGuestSelect(guest)}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{guest.name}</div>
                      {guest.nights_count && (
                        <div className="text-sm text-gray-500">
                          {guest.nights_count} {guest.nights_count === 1 ? 'noc' : guest.nights_count < 5 ? 'noci' : 'nocí'}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {onRegisterNew && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onRegisterNew}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Zaregistrovat nového hosta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

