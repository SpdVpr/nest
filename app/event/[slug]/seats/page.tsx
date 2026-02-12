'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Armchair } from 'lucide-react'
import { Session, Guest, SeatReservation } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'

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
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  const [planScale, setPlanScale] = useState(1)
  const planContainerRef = useRef<HTMLDivElement>(null)
  const planContentRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (slug && mounted) fetchData() }, [slug, mounted])

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Auto-scale floor plan to fit container
  useEffect(() => {
    if (!planContainerRef.current || !planContentRef.current) return
    const updateScale = () => {
      const container = planContainerRef.current
      const content = planContentRef.current
      if (!container || !content) return
      const availableWidth = container.offsetWidth - 0 // no extra padding needed
      const naturalWidth = content.scrollWidth
      if (naturalWidth > availableWidth) {
        setPlanScale(Math.max(0.3, availableWidth / naturalWidth))
      } else {
        setPlanScale(1)
      }
    }
    const ro = new ResizeObserver(updateScale)
    ro.observe(planContainerRef.current)
    updateScale()
    return () => ro.disconnect()
  }, [loading])

  const fetchData = async () => {
    try {
      setLoading(true)
      const eventRes = await fetch(`/api/event/${slug}`)
      if (!eventRes.ok) throw new Error('Failed')
      const eventData = await eventRes.json()
      setSession(eventData.session)

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (!guestsRes.ok) throw new Error('Failed')
      const guestsData = await guestsRes.json()
      setGuests(guestsData.guests || [])

      const seatsRes = await fetch(`/api/seats/reservations?session_id=${eventData.session.id}`)
      if (!seatsRes.ok) throw new Error('Failed')
      const seatsData = await seatsRes.json()
      setReservations(seatsData.reservations || [])

      const storedGuest = guestStorage.getCurrentGuest(slug)
      if (storedGuest && guestsData.guests) {
        const guest = guestsData.guests.find((g: Guest) => g.id === storedGuest.id)
        if (guest) setSelectedGuest(guest)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatClick = (seatId: string) => {
    if (!selectedGuest) { alert('Nejdřív si vyber svého hosta'); return }
    const reservation = reservations.find(r => r.seat_id === seatId)
    if (reservation) {
      if (reservation.guest_id === selectedGuest.id) {
        if (confirm(`Chceš zrušit svou rezervaci místa ${seatId}?`)) handleCancelReservation(reservation.id)
      } else {
        alert(`Toto místo je již rezervováno pro ${reservation.guest_name}`)
      }
      return
    }
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
          seat_id: selectedSeat, guest_id: selectedGuest.id,
          session_id: session.id, guest_name: selectedGuest.name,
        }),
      })
      if (response.ok) {
        setSelectedSeat(null); setShowConfirm(false); fetchData()
        alert('Místo bylo úspěšně rezervováno!')
      } else {
        const ed = await response.json()
        alert(`Chyba: ${ed.details || ed.error || 'Neznámá chyba'}`)
      }
    } catch { alert('Chyba při rezervaci místa') }
    finally { setSubmitting(false) }
  }

  const handleCancelReservation = async (id: string) => {
    try {
      const r = await fetch(`/api/seats/reservations/${id}`, { method: 'DELETE' })
      if (r.ok) { fetchData(); alert('Rezervace zrušena') }
      else alert('Chyba')
    } catch { alert('Chyba') }
  }

  const getSeatStatus = (seatId: string) => {
    const r = reservations.find(r => r.seat_id === seatId)
    if (!r) return { status: 'available' as const, guestName: null, isOwn: false }
    return { status: 'reserved' as const, guestName: r.guest_name, isOwn: !!(selectedGuest && r.guest_id === selectedGuest.id) }
  }

  // ─── Seat cell ───
  const CELL_W = 100
  const CELL_H = 64
  const GAP = 6

  const SeatCell = ({ id }: { id: string }) => {
    const { status, guestName, isOwn } = getSeatStatus(id)
    return (
      <button
        onClick={() => handleSeatClick(id)}
        onMouseEnter={() => setHoveredSeat(id)}
        onMouseLeave={() => setHoveredSeat(null)}
        disabled={!selectedGuest}
        className={`
          relative flex flex-col items-center justify-center rounded-md border-2 font-bold transition-all duration-150
          ${status === 'available'
            ? 'bg-green-500 hover:bg-green-400 text-white border-green-600 hover:border-green-300 hover:shadow-lg hover:scale-105'
            : isOwn
              ? 'bg-blue-500 hover:bg-blue-400 text-white border-blue-600 hover:shadow-lg hover:scale-105'
              : 'bg-red-500 text-white border-red-600 cursor-not-allowed'
          }
          ${!selectedGuest ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ width: CELL_W, height: CELL_H }}
        title={guestName ? `${id}: ${guestName}` : `${id}: Volné`}
      >
        <span className="text-xs font-extrabold leading-none opacity-70">{id}</span>
        {guestName ? (
          <span className="text-[11px] font-bold max-w-[90px] leading-tight mt-1 text-center" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{guestName}</span>
        ) : (
          <span className="text-[10px] font-medium opacity-50 mt-1">volné</span>
        )}
      </button>
    )
  }

  // Row of seat cells
  const SeatRow = ({ ids }: { ids: string[] }) => (
    <div className="flex" style={{ gap: GAP }}>
      {ids.map(id => <SeatCell key={id} id={id} />)}
    </div>
  )

  // Aisle gap with ↕ arrows
  const Aisle = ({ count }: { count: number }) => (
    <div className="flex" style={{ gap: GAP }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-center text-gray-400 text-sm font-bold" style={{ width: CELL_W, height: 42 }}>
          ↕
        </div>
      ))}
    </div>
  )

  // Table surface bar (visual divider between facing rows like B/C or D/E)
  const TableBar = ({ cols }: { cols: number }) => (
    <div
      className="rounded-sm"
      style={{
        width: cols * CELL_W + (cols - 1) * GAP,
        height: 6,
        background: '#a1a1aa',
      }}
    />
  )

  if (!mounted) return null

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

  const totalSeats = ALL_SEATS.length
  const reservedSeats = reservations.length
  const availableSeats = totalSeats - reservedSeats
  const myReservations = selectedGuest ? reservations.filter(r => r.guest_id === selectedGuest.id) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 pb-32">
      <EventGuestHeader session_slug={slug} />
      <div className="max-w-7xl mx-auto py-6">
        <Link href={`/event/${slug}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Zpět na event
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Armchair className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rezervace Míst</h1>
                {session && <p className="text-gray-600">{session.name} • {formatDate(session.start_date)}</p>}
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-green-600">{availableSeats}</div>
                <div className="text-green-400 text-xs">Volných</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-red-600">{reservedSeats}</div>
                <div className="text-red-400 text-xs">Obsazených</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-blue-600">{myReservations.length}</div>
                <div className="text-blue-400 text-xs">Moje</div>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vyber svého hosta</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {guests.map((guest) => {
              const guestSeats = reservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
              return (
                <button
                  key={guest.id}
                  onClick={() => {
                    setSelectedGuest(guest)
                    guestStorage.setCurrentGuest({ id: guest.id, name: guest.name, session_slug: slug })
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${selectedGuest?.id === guest.id
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                >
                  <div className="font-semibold">{guest.name}</div>
                  {guestSeats.length > 0 ? (
                    <div className="text-xs mt-1 text-green-600 font-medium">🪑 Místo: {guestSeats.join(', ')}</div>
                  ) : (
                    <div className="text-xs mt-1 text-gray-400">Bez místa</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
          <div className="flex flex-wrap gap-5 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 rounded bg-green-500 border-2 border-green-600"></div>
              <span className="text-gray-700">Volné (k rezervaci)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 rounded bg-red-500 border-2 border-red-600"></div>
              <span className="text-gray-700">Obsazené</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-5 rounded bg-blue-500 border-2 border-blue-600"></div>
              <span className="text-gray-700">Tvoje rezervace</span>
            </div>
          </div>
        </div>

        {/* ═══════════════ FLOOR PLAN ═══════════════ */}
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 overflow-hidden" ref={planContainerRef}>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Plán místnosti</h2>
          <p className="text-xs text-gray-500 mb-3">Klikni na zelené místo pro rezervaci</p>

          <div
            style={{
              transform: `scale(${planScale})`,
              transformOrigin: 'top left',
              height: planContentRef.current ? planContentRef.current.scrollHeight * planScale : 'auto',
            }}
          >
            <div className="inline-block min-w-max" ref={planContentRef}>
              <div className="flex items-stretch">

                {/* ════ MAIN ROOM ════ */}
                <div className="border-2 border-gray-800 rounded-l-xl bg-white relative" style={{ padding: '16px 20px' }}>

                  {/* Title bar */}
                  <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white text-center py-1.5 rounded-tl-lg" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                    Nest - nová herní místnost
                  </div>

                  <div style={{ marginTop: 28 }}>

                    {/* ── WALL (top) ── */}
                    <div className="mb-1 rounded" style={{ height: 4, background: '#d1d5db', width: 6 * CELL_W + 5 * GAP }}></div>

                    {/* Row A — u horní zdi */}
                    <SeatRow ids={['A1', 'A2', 'A3', 'A4', 'A5', 'A6']} />

                    {/* ↕ mezera (chodička) */}
                    <Aisle count={6} />

                    {/* Row B — jedna strana stolu */}
                    <SeatRow ids={['B1', 'B2', 'B3', 'B4', 'B5', 'B6']} />

                    {/* ── stůl (tenká čára = deska stolu) ── */}
                    <div className="flex justify-start my-0.5">
                      <TableBar cols={6} />
                    </div>

                    {/* Row C — druhá strana téhož stolu */}
                    <SeatRow ids={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']} />

                    {/* ↕ mezera (chodička) */}
                    <Aisle count={6} />

                    {/* Row D — jedna strana stolu */}
                    <SeatRow ids={['D1', 'D2', 'D3', 'D4', 'D5', 'D6']} />

                    {/* ── stůl ── */}
                    <div className="flex justify-start my-0.5">
                      <TableBar cols={6} />
                    </div>

                    {/* Row E — druhá strana stolu */}
                    <SeatRow ids={['E1', 'E2', 'E3', 'E4', 'E5', 'E6']} />

                    {/* ↕ mezera (chodička, delší — 8 pozic kvůli stolu F) */}
                    <Aisle count={8} />

                    {/* Row F — nejdelší stůl u protější zdi */}
                    <SeatRow ids={['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']} />

                    {/* ── WALL (bottom) ── */}
                    <div className="mt-1 rounded" style={{ height: 4, background: '#d1d5db', width: 8 * CELL_W + 7 * GAP }}></div>

                  </div>
                </div>

                {/* ════ RIGHT SIDE (hidden on mobile) ════ */}
                {!isMobile && (
                  <div className="flex" style={{ marginLeft: -2 }}>

                    {/* Right wall of gaming room with 2 door openings */}
                    <div className="flex flex-col relative" style={{ width: 8 }}>
                      {/* Wall segment above Dveře 1 */}
                      <div className="bg-gray-800" style={{ height: 80 }}></div>
                      {/* Dveře 1 opening */}
                      <div className="bg-amber-700 flex items-center justify-center" style={{ height: 50 }}>
                        <span className="text-[8px] font-bold text-amber-200" style={{ writingMode: 'vertical-lr' }}>D1</span>
                      </div>
                      {/* Wall segment between doors — longer to push D2 lower */}
                      <div className="bg-gray-800 flex-1" style={{ minHeight: 200 }}></div>
                      {/* Dveře 2 opening — lower, near Deskovky */}
                      <div className="bg-amber-700 flex items-center justify-center" style={{ height: 50 }}>
                        <span className="text-[8px] font-bold text-amber-200" style={{ writingMode: 'vertical-lr' }}>D2</span>
                      </div>
                      {/* Wall segment below Dveře 2 */}
                      <div className="bg-gray-800" style={{ height: 150 }}></div>
                    </div>

                    {/* Corridor + gap + Deskovky stacked vertically */}
                    <div className="flex flex-col">

                      {/* Chodba + Vchod side by side */}
                      <div className="flex">
                        {/* Chodba */}
                        <div className="flex items-center justify-center border-2 border-l-0 border-gray-600 bg-gray-100" style={{ width: 330, height: 150 }}>
                          <span className="text-sm font-semibold text-gray-400 tracking-wider">Chodba</span>
                        </div>
                        {/* Vchod — aligned with Chodba, entrance leads into corridor */}
                        <div className="flex items-center justify-center border-2 border-l-0 border-gray-600 bg-gray-700 text-white rounded-r-lg" style={{ width: 36, height: 150 }}>
                          <span className="text-[9px] font-bold tracking-wider" style={{ writingMode: 'vertical-lr' }}>VCHOD</span>
                        </div>
                      </div>

                      {/* Gap / volný prostor — flex-1 pushes Deskovky to bottom */}
                      <div className="flex-1" style={{ minHeight: 110 }}></div>

                      {/* Deskovky — wide rectangle */}
                      <div className="flex items-center justify-center border-2 border-gray-600 bg-indigo-50 rounded-lg" style={{ width: 330, height: 300 }}>
                        <div className="text-center">
                          <div className="text-3xl mb-2">🎲</div>
                          <span className="text-lg font-semibold text-indigo-600">Deskovky</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* My reservations */}
        {selectedGuest && myReservations.length > 0 && (
          <div className="mt-6 bg-blue-50 rounded-2xl shadow-xl border border-blue-200 p-5">
            <h3 className="font-bold text-blue-800 mb-3 text-sm">🎯 Tvoje rezervace ({selectedGuest.name})</h3>
            <div className="flex flex-wrap gap-2">
              {myReservations.map(r => (
                <span key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 border border-blue-300 text-blue-800 text-sm font-semibold">
                  <Armchair className="w-4 h-4" /> {r.seat_id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {
        showConfirm && selectedSeat && selectedGuest && (
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
                  onClick={() => { setShowConfirm(false); setSelectedSeat(null) }}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >Zrušit</button>
                <button
                  onClick={handleReserve}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >{submitting ? 'Rezervuji...' : 'Potvrdit'}</button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
