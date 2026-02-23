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
  onClose?: () => void
  onRegisterNew?: () => void
}

export default function GuestSelectionModal({
  guests,
  session_slug,
  isOpen,
  onGuestSelected,
  onClose,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--nest-surface)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--nest-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>Vyber svého hosta</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: 'var(--nest-text-tertiary)' }}
                title="Zavřít"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
            Pro pokračování si vyber své jméno ze seznamu
          </p>
        </div>

        {/* Search */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--nest-border)' }}>
          <input
            type="text"
            placeholder="Hledat jméno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nest-yellow)]"
            style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
            autoFocus
          />
        </div>

        {/* Guest List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--nest-text-tertiary)' }}>
              {searchQuery ? 'Žádný host nenalezen' : 'Žádní hosté'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => handleGuestSelect(guest)}
                  className="w-full text-left p-4 rounded-xl border-2 transition-all group"
                  style={{ borderColor: 'var(--nest-border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--nest-yellow)'
                    e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--nest-border)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                    >
                      <User className="w-5 h-5" style={{ color: 'var(--nest-yellow)' }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>{guest.name}</div>
                      {guest.nights_count && (
                        <div className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
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
          <div className="p-4" style={{ borderTop: '1px solid var(--nest-border)' }}>
            <button
              onClick={onRegisterNew}
              className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--nest-yellow)', color: 'var(--nest-bg)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
