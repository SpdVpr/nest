'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Armchair, Check, X } from 'lucide-react'
import { Session, Guest, SeatReservation } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'

// Define all seats for validation
const ALL_SEATS = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'
]

export default function EventSeatsPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [reservations, setReservations] = useState<SeatReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (slug && mounted) {
      fetchData()
    }
  }, [slug, mounted])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch event/session
      const eventRes = await fetch(`/api/event/${slug}`)
      if (!eventRes.ok) throw new Error('Failed to fetch event')
      const eventData = await eventRes.json()
      setSession(eventData.session)

      // Fetch guests
      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (!guestsRes.ok) throw new Error('Failed to fetch guests')
      const guestsData = await guestsRes.json()
      setGuests(guestsData.guests || [])

      // Fetch seat reservations
      const seatsRes = await fetch(`/api/seats/reservations?session_id=${eventData.session.id}`)
      if (!seatsRes.ok) throw new Error('Failed to fetch seat reservations')
      const seatsData = await seatsRes.json()
      setReservations(seatsData.reservations || [])

      // Try to load selected guest from storage
      const storedGuest = guestStorage.getCurrentGuest(slug)
      if (storedGuest && guestsData.guests) {
        const guest = guestsData.guests.find((g: Guest) => g.id === storedGuest.id)
        if (guest) {
          setSelectedGuest(guest)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatClick = (seatId: string) => {
    if (!selectedGuest) {
      alert('Nejdřív si vyber svého hosta')
      return
    }

    const reservation = reservations.find(r => r.seat_id === seatId)
    
    if (reservation) {
      if (reservation.guest_id === selectedGuest.id) {
        // User's own reservation - allow cancellation
        if (confirm(`Chceš zrušit svou rezervaci místa ${seatId}?`)) {
          handleCancelReservation(reservation.id)
        }
      } else {
        alert(`Toto místo je již rezervováno pro ${reservation.guest_name}`)
      }
      return
    }

    // Seat is available - select it
    setSelectedSeat(seatId)
    setShowConfirm(true)
  }

  const handleReserve = async () => {
    if (!selectedGuest || !selectedSeat || !session) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/seats/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_id: selectedSeat,
          guest_id: selectedGuest.id,
          session_id: session.id,
          guest_name: selectedGuest.name,
        }),
      })

      if (response.ok) {
        setSelectedSeat(null)
        setShowConfirm(false)
        fetchData()
        alert('Místo bylo úspěšně rezervováno!')
      } else {
        const errorData = await response.json()
        console.error('Reservation error:', errorData)
        const errorMsg = errorData.details || errorData.error || 'Neznámá chyba'
        alert(`Chyba při rezervaci: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error reserving seat:', error)
      alert('Chyba při rezervaci místa')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/seats/reservations/${reservationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
        alert('Rezervace byla zrušena')
      } else {
        alert('Chyba při rušení rezervace')
      }
    } catch (error) {
      console.error('Error canceling reservation:', error)
      alert('Chyba při rušení rezervace')
    }
  }

  const getSeatStatus = (seatId: string) => {
    const reservation = reservations.find(r => r.seat_id === seatId)
    if (!reservation) return { status: 'available', guestName: null, isOwn: false }
    
    const isOwn = selectedGuest && reservation.guest_id === selectedGuest.id
    return { 
      status: 'reserved', 
      guestName: reservation.guest_name,
      isOwn 
    }
  }

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítám...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <EventGuestHeader session_slug={slug} />
      <div className="max-w-7xl mx-auto py-6">
        <Link
          href={`/event/${slug}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zpět na event
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Armchair className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Rezervace Míst
                </h1>
                {session && (
                  <p className="text-gray-600">
                    {session.name} • {formatDate(session.start_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Guest Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vyber svého hosta</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {guests.map((guest) => (
              <button
                key={guest.id}
                onClick={() => {
                  setSelectedGuest(guest)
                  guestStorage.setCurrentGuest({
                    id: guest.id,
                    name: guest.name,
                    session_slug: slug
                  })
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedGuest?.id === guest.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div className="font-semibold">{guest.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seat Map */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Plán místnosti</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Volné</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Obsazené</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Tvoje rezervace</span>
              </div>
            </div>
          </div>

          {/* Room Layout - Exact replica of the image */}
          <div className="bg-gray-100 rounded-xl p-4 border-4 border-gray-800 overflow-x-auto">
            <div className="inline-block min-w-max relative">
              {/* Row A */}
              <div className="flex gap-1 mb-1">
                {['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((seatId) => {
                  const { status, guestName, isOwn } = getSeatStatus(seatId)
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={!selectedGuest}
                      className={`relative w-16 h-10 rounded font-bold text-xs transition-all border-2 ${
                        status === 'available'
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-700'
                          : isOwn
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700'
                          : 'bg-red-500 text-white cursor-not-allowed border-red-700'
                      } ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={guestName || 'Volné místo'}
                    >
                      <div>{seatId}</div>
                      {guestName && (
                        <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-black bg-opacity-50 px-0.5 truncate">
                          {guestName}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Corridor between A and B */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-16 h-6 flex items-center justify-center text-gray-400 text-lg">
                    ↕
                  </div>
                ))}
              </div>

              {/* Row B */}
              <div className="flex gap-1 mb-1">
                {['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((seatId) => {
                  const { status, guestName, isOwn } = getSeatStatus(seatId)
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={!selectedGuest}
                      className={`relative w-16 h-10 rounded font-bold text-xs transition-all border-2 ${
                        status === 'available'
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-700'
                          : isOwn
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700'
                          : 'bg-red-500 text-white cursor-not-allowed border-red-700'
                      } ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={guestName || 'Volné místo'}
                    >
                      <div>{seatId}</div>
                      {guestName && (
                        <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-black bg-opacity-50 px-0.5 truncate">
                          {guestName}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Row C */}
              <div className="flex gap-1 mb-2">
                {['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((seatId) => {
                  const { status, guestName, isOwn } = getSeatStatus(seatId)
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={!selectedGuest}
                      className={`relative w-16 h-10 rounded font-bold text-xs transition-all border-2 ${
                        status === 'available'
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-700'
                          : isOwn
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700'
                          : 'bg-red-500 text-white cursor-not-allowed border-red-700'
                      } ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={guestName || 'Volné místo'}
                    >
                      <div>{seatId}</div>
                      {guestName && (
                        <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-black bg-opacity-50 px-0.5 truncate">
                          {guestName}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Large corridor between C and D with arrows */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-16 h-6 flex items-center justify-center text-gray-400 text-lg">
                    ↕
                  </div>
                ))}
              </div>

              {/* Row D */}
              <div className="flex gap-1 mb-1">
                {['D1', 'D2', 'D3', 'D4', 'D5', 'D6'].map((seatId) => {
                  const { status, guestName, isOwn } = getSeatStatus(seatId)
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={!selectedGuest}
                      className={`relative w-16 h-10 rounded font-bold text-xs transition-all border-2 ${
                        status === 'available'
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-700'
                          : isOwn
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700'
                          : 'bg-red-500 text-white cursor-not-allowed border-red-700'
                      } ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={guestName || 'Volné místo'}
                    >
                      <div>{seatId}</div>
                      {guestName && (
                        <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-black bg-opacity-50 px-0.5 truncate">
                          {guestName}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Row E */}
              <div className="flex gap-1 mb-2">
                {['E1', 'E2', 'E3', 'E4', 'E5', 'E6'].map((seatId) => {
                  const { status, guestName, isOwn } = getSeatStatus(seatId)
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={!selectedGuest}
                      className={`relative w-16 h-10 rounded font-bold text-xs transition-all border-2 ${
                        status === 'available'
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-700'
                          : isOwn
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700'
                          : 'bg-red-500 text-white cursor-not-allowed border-red-700'
                      } ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={guestName || 'Volné místo'}
                    >
                      <div>{seatId}</div>
                      {guestName && (
                        <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-black bg-opacity-50 px-0.5 truncate">
                          {guestName}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Large corridor between E and F with arrows */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-16 h-6 flex items-center justify-center text-gray-400 text-lg">
                    ↕
                  </div>
                ))}
              </div>

              {/* Row F */}
              <div className="flex gap-1 mb-2">
                {['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'].map((seatId) => {
                  const { status, guestName, isOwn } = getSeatStatus(seatId)
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={!selectedGuest}
                      className={`relative w-16 h-10 rounded font-bold text-xs transition-all border-2 ${
                        status === 'available'
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-700'
                          : isOwn
                          ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700'
                          : 'bg-red-500 text-white cursor-not-allowed border-red-700'
                      } ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={guestName || 'Volné místo'}
                    >
                      <div>{seatId}</div>
                      {guestName && (
                        <div className="absolute bottom-0 left-0 right-0 text-[7px] bg-black bg-opacity-50 px-0.5 truncate">
                          {guestName}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && selectedSeat && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Potvrdit rezervaci</h3>
            
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Místo:</span>
                  <span className="font-bold text-blue-900">{selectedSeat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Host:</span>
                  <span className="font-bold text-blue-900">{selectedGuest.name}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setSelectedSeat(null)
                }}
                disabled={submitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Zrušit
              </button>
              <button
                onClick={handleReserve}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {submitting ? 'Rezervuji...' : 'Potvrdit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

