'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, UserCheck, Calendar, Moon, Armchair, LogOut } from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'

export default function GuestsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentGuest, setCurrentGuest] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [seatReservations, setSeatReservations] = useState<{ id: string, seat_id: string, guest_id: string, guest_name: string }[]>([])
  const [unregistering, setUnregistering] = useState(false)

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
      let sessionData: any = null
      if (sessionRes.ok) {
        sessionData = await sessionRes.json()
        setSession(sessionData.session)
      }

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests || [])
      }

      // Fetch seat reservations
      if (sessionData?.session?.id) {
        const seatsRes = await fetch(`/api/seats/reservations?session_id=${sessionData.session.id}`)
        if (seatsRes.ok) {
          const seatsData = await seatsRes.json()
          setSeatReservations(seatsData.reservations || [])
        }
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
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Users className="w-8 h-8 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">Registrovaní uživatelé</h1>
                  {session && (
                    <div className="text-gray-600 text-sm mt-1 break-words">
                      <div>{session.name}</div>
                      <div>{formatDate(session.start_date)}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-purple-50 px-4 py-2 rounded-xl border-2 border-purple-200 flex-shrink-0 text-center min-w-[100px]">
                <p className="text-sm text-purple-600 font-medium">
                  Celkem
                </p>
                <p className="text-3xl font-bold text-purple-700">{guests.length}</p>
                <p className="text-xs text-purple-500">
                  {guests.length === 1 ? 'host' : guests.length >= 2 && guests.length <= 4 ? 'hosté' : 'hostů'}
                </p>
              </div>
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
            <>
              {/* Compact Table View */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Rychlý přehled</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-50 border-b-2 border-purple-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Jméno</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Místo</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Počet nocí</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Rozsah dní</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guests.map((guest, index) => {
                        const isCurrentGuest = currentGuest === guest.id
                        let dayRange = '-'
                        if (guest.check_in_date && guest.check_out_date && session?.start_date) {
                          const sessionStart = new Date(session.start_date)
                          sessionStart.setHours(0, 0, 0, 0)

                          const checkIn = new Date(guest.check_in_date)
                          checkIn.setHours(0, 0, 0, 0)

                          const checkOut = new Date(guest.check_out_date)
                          checkOut.setHours(0, 0, 0, 0)

                          const startDay = Math.floor((checkIn.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                          const endDay = Math.floor((checkOut.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

                          if (startDay === endDay) {
                            dayRange = `${startDay}`
                          } else {
                            dayRange = `${startDay}-${endDay}`
                          }
                        }

                        return (
                          <tr
                            key={guest.id}
                            className={`border-b border-gray-200 hover:bg-purple-50 transition-colors ${isCurrentGuest ? 'bg-purple-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{guest.name}</span>
                                {isCurrentGuest && (
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {(() => {
                                const seats = seatReservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
                                return seats.length > 0 ? (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-semibold">
                                    🪑 {seats.join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )
                              })()}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700">
                              {guest.nights_count}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 font-medium">
                              {dayRange}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Cards View */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Detailní přehled</h2>
              </div>
              <div className="space-y-3">
                {guests.map((guest) => {
                  const isCurrentGuest = currentGuest === guest.id
                  return (
                    <button
                      key={guest.id}
                      onClick={() => handleGuestSelect(guest)}
                      className={`w-full text-left px-6 py-5 rounded-xl border-2 transition-all ${isCurrentGuest
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

                            {/* Místo */}
                            {(() => {
                              const seats = seatReservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
                              return seats.length > 0 ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Armchair className="w-4 h-4 text-green-500" />
                                  <span className="text-gray-600">
                                    Místo: <span className="font-semibold text-green-700">{seats.join(', ')}</span>
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm">
                                  <Armchair className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400 italic text-xs">Bez místa</span>
                                </div>
                              )
                            })()}

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

                          {/* Unregister button - only for current guest before event start */}
                          {isCurrentGuest && session && new Date(session.start_date) > new Date() && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!confirm('Opravdu se chceš odhlásit z akce?\n\nBudou zrušeny všechny tvoje rezervace (HW, místo, hry).')) return
                                  setUnregistering(true)
                                  try {
                                    const res = await fetch(`/api/event/${slug}/guests/${guest.id}`, { method: 'DELETE' })
                                    if (res.ok) {
                                      guestStorage.clearCurrentGuest()
                                      setCurrentGuest(null)
                                      alert('Byl/a jsi odhlášen/a z akce. Všechny rezervace byly zrušeny.')
                                      fetchData()
                                    } else {
                                      const data = await res.json()
                                      alert(`Chyba: ${data.error || 'Nepodařilo se odhlásit'}`)
                                    }
                                  } catch (err) {
                                    alert('Chyba při odhlašování z akce')
                                  } finally {
                                    setUnregistering(false)
                                  }
                                }}
                                disabled={unregistering}
                                className="inline-flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                              >
                                <LogOut className="w-4 h-4" />
                                {unregistering ? 'Odhlašuji...' : 'Odhlásit se z akce'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
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
