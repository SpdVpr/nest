'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Users, UserCheck, Calendar, Moon } from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'

export default function GuestsPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentGuest, setCurrentGuest] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (slug) {
      fetchData()
    }
  }, [slug])

  useEffect(() => {
    if (mounted && slug) {
      const guest = guestStorage.getCurrentGuest(slug)
      setCurrentGuest(guest?.id || null)
    }
  }, [mounted, slug])

  const fetchData = async () => {
    try {
      setLoading(true)

      const sessionRes = await fetch(`/api/event/${slug}`)
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData.session)
      }

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSelect = (guest: Guest) => {
    guestStorage.setCurrentGuest({
      id: guest.id,
      name: guest.name,
      session_slug: slug
    })
    setCurrentGuest(guest.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">👥</div>
          <p className="text-gray-600">Načítám...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12 px-4">
      <EventGuestHeader session_slug={slug} />
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/event/${slug}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Zpět na event
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Registrovaní uživatelé</h1>
                {session && (
                  <p className="text-gray-600 text-sm mt-1">
                    {session.name} • {formatDate(session.start_date)}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-purple-50 px-6 py-3 rounded-xl border-2 border-purple-200">
              <p className="text-sm text-purple-600 font-medium">
                Celkem: <span className="text-3xl font-bold text-purple-700">{guests.length}</span>
              </p>
              <p className="text-xs text-purple-500 text-center mt-1">
                {guests.length === 1 ? 'host' : guests.length >= 2 && guests.length <= 4 ? 'hosté' : 'hostů'}
              </p>
            </div>
          </div>

          {guests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">Zatím nejsou registrováni žádní uživatelé</p>
              <Link
                href={`/event/${slug}/register`}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Zaregistruj se
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {guests.map((guest) => {
                const isCurrentGuest = currentGuest === guest.id
                return (
                  <button
                    key={guest.id}
                    onClick={() => handleGuestSelect(guest)}
                    className={`w-full text-left px-6 py-5 rounded-xl border-2 transition-all ${
                      isCurrentGuest
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <p className="font-bold text-lg text-gray-900">{guest.name}</p>
                          {isCurrentGuest && (
                            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                              <UserCheck className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">Přihlášen/a</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {/* Počet nocí */}
                          <div className="flex items-center gap-2 text-sm">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <span className="text-gray-600">
                              <span className="font-semibold text-gray-900">{guest.nights_count}</span>{' '}
                              {guest.nights_count === 1 ? 'noc' : guest.nights_count >= 2 && guest.nights_count <= 4 ? 'noci' : 'nocí'}
                            </span>
                          </div>

                          {/* Datum příjezdu a odjezdu */}
                          {guest.check_in_date && guest.check_out_date ? (
                            <div className="flex items-start gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <div className="text-gray-600">
                                <div>
                                  <span className="text-xs text-gray-500">Příjezd:</span>{' '}
                                  <span className="font-medium text-gray-900">
                                    {new Date(guest.check_in_date).toLocaleDateString('cs-CZ', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Odjezd:</span>{' '}
                                  <span className="font-medium text-gray-900">
                                    {new Date(guest.check_out_date).toLocaleDateString('cs-CZ', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400 italic text-xs">Datum příjezdu/odjezdu neuvedeno</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href={`/event/${slug}/snacks`}
              className="w-full block text-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold transition-all"
            >
              Přejít na občerstvení
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
