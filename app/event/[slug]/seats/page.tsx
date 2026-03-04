'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Armchair, Monitor, Cpu, Gamepad2, Edit2 } from 'lucide-react'
import NestPage from '@/components/NestPage'
import { Session, Guest, SeatReservation } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import NestLoading from '@/components/NestLoading'

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
  const [hwReservations, setHwReservations] = useState<any[]>([])
  const [gameInstalls, setGameInstalls] = useState<Record<string, string[]>>({})
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

      // Fetch HW reservations
      const hwRes = await fetch(`/api/hardware/reservations?session_id=${eventData.session.id}`)
      if (hwRes.ok) {
        const hwData = await hwRes.json()
        setHwReservations(hwData.reservations || [])
      }

      // Fetch game install requests
      const installRes = await fetch(`/api/game-installs?session_id=${eventData.session.id}`)
      if (installRes.ok) {
        const installData = await installRes.json()
        const installMap: Record<string, string[]> = {}
          ; (installData.requests || []).forEach((r: any) => {
            installMap[r.guest_id] = r.game_names || []
          })
        setGameInstalls(installMap)
      }

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
    const reservation = reservations.find(r => r.seat_id === seatId) as any
    if (reservation) {
      if (reservation.guest_id === selectedGuest.id) {
        // Own reservation (manual or auto) → offer cancel
        if (!reservation.auto_reserved) {
          if (confirm(`Chceš zrušit svou rezervaci místa ${seatId}?`)) handleCancelReservation(reservation.id)
        } else {
          // Auto-reserved own seat — just inform
          alert(`Toto místo je automaticky rezervované jako tvůj druhý stůl.`)
        }
      } else if (reservation.auto_reserved) {
        // Auto-reserved by someone else → allow override
        setSelectedSeat(seatId)
        setShowConfirm(true)
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
    const r = reservations.find(r => r.seat_id === seatId) as any
    if (!r) return { status: 'available' as const, guestName: null, isOwn: false, autoReserved: false, isCoffee: false }
    const isOwn = !!(selectedGuest && r.guest_id === selectedGuest.id)
    const isCoffee = r.guest_id === '__coffee__'
    return { status: 'reserved' as const, guestName: r.guest_name, isOwn, autoReserved: !!r.auto_reserved, isCoffee }
  }

  // ─── Seat cell ───
  const CELL_W = 100
  const CELL_H = 64
  const GAP = 6

  const SeatCell = ({ id }: { id: string }) => {
    const { status, guestName, isOwn, autoReserved, isCoffee } = getSeatStatus(id)
    const isAutoReservedByOther = status === 'reserved' && autoReserved && !isOwn

    return (
      <button
        onClick={() => !isCoffee && handleSeatClick(id)}
        onMouseEnter={() => setHoveredSeat(id)}
        onMouseLeave={() => setHoveredSeat(null)}
        disabled={!selectedGuest || isCoffee}
        className={`
          relative flex flex-col items-center justify-center rounded-md font-bold transition-all duration-150
          ${isCoffee
            ? 'bg-amber-800/40 text-amber-200/80 border-2 border-solid border-amber-600/50 cursor-not-allowed'
            : status === 'available'
              ? 'bg-emerald-700/60 hover:bg-emerald-600/70 text-white border-2 border-solid border-emerald-600/80 hover:border-emerald-400 hover:shadow-lg hover:scale-105'
              : isOwn
                ? autoReserved
                  ? 'bg-[var(--nest-yellow)]/15 text-white/70 border-2 border-dashed border-[var(--nest-yellow)]/40'
                  : 'bg-[var(--nest-yellow)]/30 hover:bg-[var(--nest-yellow)]/40 text-white border-2 border-solid border-[var(--nest-yellow)]/60 hover:shadow-lg hover:scale-105'
                : isAutoReservedByOther
                  ? 'bg-amber-900/25 text-white/60 border-2 border-dashed border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-800/30 hover:scale-105 cursor-pointer'
                  : 'bg-red-900/50 text-white/80 border-2 border-solid border-red-700/60 cursor-not-allowed'
          }
          ${!selectedGuest && !isCoffee ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ width: CELL_W, height: CELL_H }}
        title={
          isCoffee
            ? `${id}: ☕ Kafe (rezervováno)`
            : isAutoReservedByOther
              ? `${id}: Autorezervace (${guestName}) — klikni pro přerezervování`
              : guestName ? `${id}: ${guestName}` : `${id}: Volné`
        }
      >
        <span className="text-xs font-extrabold leading-none opacity-70">{id}</span>
        {isCoffee ? (
          <>
            <span className="text-lg mt-0.5">☕</span>
            <span className="text-[9px] font-bold opacity-70">Kafe</span>
          </>
        ) : guestName ? (
          <>
            <span className="text-[11px] font-bold max-w-[90px] leading-tight mt-1 text-center" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{guestName}</span>
            {autoReserved && (
              <span className="text-[8px] opacity-50 mt-0.5">auto</span>
            )}
          </>
        ) : (
          <span className="text-[10px] font-medium opacity-50 mt-1">volné</span>
        )}
      </button>
    )
  }

  // Row of seat cells — pairs wrapped in table rectangles
  const SeatRow = ({ ids }: { ids: string[] }) => {
    const tables: string[][] = []
    for (let i = 0; i < ids.length; i += 2) {
      tables.push(ids.slice(i, i + 2))
    }
    return (
      <div className="flex" style={{ gap: GAP }}>
        {tables.map((tableSeats, tableIdx) => (
          <div
            key={tableIdx}
            className="flex rounded-lg"
            style={{
              gap: GAP,
              border: '2px solid rgba(245, 158, 11, 0.3)',
              padding: 3,
            }}
          >
            {tableSeats.map(id => <SeatCell key={id} id={id} />)}
          </div>
        ))}
      </div>
    )
  }

  // Aisle gap with ↕ arrows
  const Aisle = ({ count }: { count: number }) => (
    <div className="flex" style={{ gap: 11 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-center text-[var(--nest-text-tertiary)] text-sm font-bold" style={{ width: CELL_W, height: 42 }}>
          ↕
        </div>
      ))}
    </div>
  )

  // Table surface bar (visual divider between facing rows like B/C or D/E)
  const TableBar = () => (
    <div
      className="rounded-sm"
      style={{
        width: 656,
        height: 6,
        background: 'rgba(255,255,255,0.15)',
      }}
    />
  )

  if (!mounted) return null

  if (loading) {
    return <NestLoading message="Načítám místa..." />
  }

  const totalSeats = ALL_SEATS.length
  const reservedSeats = reservations.length
  const availableSeats = totalSeats - reservedSeats
  const myReservations = selectedGuest ? reservations.filter(r => r.guest_id === selectedGuest.id) : []

  return (
    <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Rezervace Míst" maxWidth="max-w-7xl">

      {/* Header */}
      <div className="nest-card-elevated p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Armchair className="w-6 h-6 text-[var(--nest-yellow)]" />
            <div>
              <h1 className="text-xl font-bold">Rezervace Míst</h1>
              {session && <p className="text-[var(--nest-white-60)] text-sm">{session.name} • {formatDate(session.start_date)}</p>}
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="bg-[var(--nest-success)]/10 border border-[var(--nest-success)]/20 rounded-xl px-3 py-1.5 text-center">
              <div className="text-lg font-bold text-[var(--nest-success)]">{availableSeats}</div>
              <div className="text-[var(--nest-success)]/60 text-[10px]">Volných</div>
            </div>
            <div className="bg-[var(--nest-error)]/10 border border-[var(--nest-error)]/20 rounded-xl px-3 py-1.5 text-center">
              <div className="text-lg font-bold text-[var(--nest-error)]">{reservedSeats}</div>
              <div className="text-[var(--nest-error)]/60 text-[10px]">Obsazených</div>
            </div>
            <div className="bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20 rounded-xl px-3 py-1.5 text-center">
              <div className="text-lg font-bold text-[var(--nest-yellow)]">{myReservations.length}</div>
              <div className="text-[var(--nest-yellow)]/60 text-[10px]">Moje</div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Selection */}
      <div className="nest-card-elevated p-6 mb-6">
        <h2 className="text-base font-bold mb-3">Vyber svého hosta</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {guests.map((guest) => {
            const guestSeats = reservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
            const guestHw = hwReservations.filter((r: any) => r.guest_id === guest.id && r.status !== 'cancelled')
            const guestGames = gameInstalls[guest.id] || []
            const isSelected = selectedGuest?.id === guest.id
            const hasPc = guestHw.some((r: any) => r.hardware_items?.type === 'pc')
            const hasMonitor = guestHw.some((r: any) => r.hardware_items?.type === 'monitor')
            const hasAccessory = guestHw.some((r: any) => r.hardware_items?.type === 'accessory')

            return (
              <button
                key={guest.id}
                onClick={() => {
                  setSelectedGuest(guest)
                  guestStorage.setCurrentGuest({ id: guest.id, name: guest.name, session_slug: slug })
                }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                  ? 'border-[var(--nest-yellow)] bg-[var(--nest-yellow)]/10 text-[var(--nest-text-primary)]'
                  : 'border-[var(--nest-border)] hover:border-[var(--nest-yellow)]/40 text-[var(--nest-text-primary)]'
                  }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="font-semibold truncate">{guest.name}</div>
                  {/* Small HW/game indicators */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {hasPc && <Cpu className="w-3 h-3 text-blue-400/60" />}
                    {hasMonitor && <Monitor className="w-3 h-3 text-purple-400/60" />}
                    {hasAccessory && <Gamepad2 className="w-3 h-3 text-green-400/60" />}
                    {guestGames.length > 0 && <span className="text-[10px] leading-none">🎮</span>}
                  </div>
                </div>
                {guestSeats.length > 0 ? (
                  <div className="text-xs mt-1 text-emerald-400/80 font-medium">🪑 {guestSeats.join(', ')}</div>
                ) : (
                  <div className="text-xs mt-1 text-[var(--nest-text-tertiary)]">Bez místa</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Guest Detail Panel */}
      {selectedGuest && (() => {
        const guestHw = hwReservations.filter((r: any) => r.guest_id === selectedGuest.id && r.status !== 'cancelled')
        const guestGames = gameInstalls[selectedGuest.id] || []
        const guestSeats = reservations.filter(r => r.guest_id === selectedGuest.id).map(r => r.seat_id)

        if (guestHw.length === 0 && guestGames.length === 0) {
          return (
            <div className="bg-[var(--nest-surface)] rounded-2xl shadow-xl p-5 mb-6 border border-[var(--nest-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[var(--nest-text-primary)] flex items-center gap-2">
                    <span className="text-[var(--nest-yellow)]">{selectedGuest.name}</span>
                    {guestSeats.length > 0 && <span className="text-xs text-emerald-400/80 font-medium">🪑 {guestSeats.join(', ')}</span>}
                  </h3>
                  <p className="text-sm text-[var(--nest-text-tertiary)] mt-1">Žádný hardware ani hry k instalaci</p>
                </div>
                <Link
                  href={`/event/${slug}/hardware`}
                  className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-bg)] font-semibold transition-colors shadow-lg shadow-[var(--nest-yellow)]/20"
                >
                  <Edit2 className="w-4 h-4" />
                  Přidat HW a hry
                </Link>
              </div>
            </div>
          )
        }

        // Sort: PC first, then monitor, then accessories
        const typeOrder = (t?: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2
        const sortedHw = [...guestHw].sort((a: any, b: any) => typeOrder(a.hardware_items?.type) - typeOrder(b.hardware_items?.type))

        return (
          <div className="bg-[var(--nest-surface)] rounded-2xl shadow-xl overflow-hidden mb-6 border border-[var(--nest-border)]">
            {/* Header */}
            <div className="px-5 py-3 bg-gradient-to-r from-[var(--nest-yellow)]/10 to-transparent border-b border-[var(--nest-border)]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--nest-text-primary)] flex items-center gap-2">
                  <span className="text-[var(--nest-yellow)]">{selectedGuest.name}</span>
                  {guestSeats.length > 0 && <span className="text-xs text-emerald-400/80 font-medium">🪑 {guestSeats.join(', ')}</span>}
                </h3>
                <Link
                  href={`/event/${slug}/hardware`}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/30 text-[var(--nest-yellow)] hover:bg-[var(--nest-yellow)] hover:text-[var(--nest-bg)] transition-all font-semibold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Upravit HW a hry
                </Link>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* HW Reservations */}
              {sortedHw.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[var(--nest-text-secondary)] mb-2 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    Rezervovaný hardware
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sortedHw.map((hw: any, i: number) => {
                      const type = hw.hardware_items?.type || 'accessory'
                      const name = hw.hardware_items?.name || 'Neznámé'
                      return (
                        <span key={i} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${type === 'pc' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : type === 'monitor' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-green-500/10 text-green-400 border-green-500/20'
                          }`}>
                          {type === 'pc' ? <Cpu className="w-3.5 h-3.5" /> : type === 'monitor' ? <Monitor className="w-3.5 h-3.5" /> : <Gamepad2 className="w-3.5 h-3.5" />}
                          {hw.quantity > 1 ? `${hw.quantity}× ` : ''}{name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Game Installs */}
              {guestGames.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[var(--nest-text-secondary)] mb-2 flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-[var(--nest-yellow)]" />
                    Hry k instalaci ({guestGames.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {guestGames.map((name, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[var(--nest-yellow)]/10 text-[var(--nest-yellow)] font-medium border border-[var(--nest-yellow)]/20">
                        🎮 {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Legend */}
      <div className="bg-[var(--nest-surface)] rounded-2xl shadow-xl p-4 mb-6">
        <div className="flex flex-wrap gap-5 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 rounded bg-emerald-700/60 border-2 border-emerald-600/80"></div>
            <span className="text-[var(--nest-text-secondary)]">Volné (k rezervaci)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 rounded bg-red-900/50 border-2 border-red-700/60"></div>
            <span className="text-[var(--nest-text-secondary)]">Obsazené</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 rounded bg-amber-900/25 border-2 border-dashed border-amber-500/30"></div>
            <span className="text-[var(--nest-text-secondary)]">Auto-rezervace (lze obsadit)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 rounded bg-[var(--nest-yellow)]/30 border-2 border-[var(--nest-yellow)]/60"></div>
            <span className="text-[var(--nest-text-secondary)]">Tvoje rezervace</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-5 rounded bg-amber-800/40 border-2 border-amber-600/50 flex items-center justify-center text-[8px]">☕</div>
            <span className="text-[var(--nest-text-secondary)]">Kafe (rezervováno)</span>
          </div>
        </div>
      </div>

      {/* ═══════════════ FLOOR PLAN ═══════════════ */}
      <div className="bg-[var(--nest-surface)] rounded-2xl shadow-xl p-4 md:p-6 overflow-hidden" ref={planContainerRef}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-[var(--nest-text-primary)]">Plán místnosti</h2>
          <span className="text-xs font-semibold text-[var(--nest-white-60)] bg-[var(--nest-dark-3)] px-3 py-1 rounded-full">📏 1 místo = 80 cm</span>
        </div>
        <p className="text-xs text-[var(--nest-text-tertiary)] mb-3">Klikni na zelené místo pro rezervaci</p>

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
              <div className="border-2 border-[var(--nest-border)] rounded-l-xl bg-[var(--nest-bg)] relative" style={{ padding: '16px 20px' }}>

                {/* Title bar */}
                <div className="absolute top-0 left-0 right-0 bg-[var(--nest-surface-alt)] text-[var(--nest-text-primary)] text-center py-1.5 rounded-tl-lg" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                  Nest - nová herní místnost
                </div>

                <div style={{ marginTop: 28 }}>

                  {/* ── WALL (top) ── */}


                  {/* Row A — u horní zdi */}
                  <SeatRow ids={['A1', 'A2', 'A3', 'A4', 'A5', 'A6']} />

                  {/* ↕ mezera (chodička) */}
                  <Aisle count={6} />

                  {/* Row B — jedna strana stolu */}
                  <SeatRow ids={['B1', 'B2', 'B3', 'B4', 'B5', 'B6']} />

                  {/* ── stůl (tenká čára = deska stolu) ── */}
                  <div className="flex justify-start my-0.5">
                    <TableBar />
                  </div>

                  {/* Row C — druhá strana téhož stolu */}
                  <SeatRow ids={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']} />

                  {/* ↕ mezera (chodička) */}
                  <Aisle count={6} />

                  {/* Row D — jedna strana stolu */}
                  <SeatRow ids={['D1', 'D2', 'D3', 'D4', 'D5', 'D6']} />

                  {/* ── stůl ── */}
                  <div className="flex justify-start my-0.5">
                    <TableBar />
                  </div>

                  {/* Row E — druhá strana stolu */}
                  <SeatRow ids={['E1', 'E2', 'E3', 'E4', 'E5', 'E6']} />

                  {/* ↕ mezera (chodička, delší — 8 pozic kvůli stolu F) */}
                  <Aisle count={8} />

                  {/* Row F — nejdelší stůl u protější zdi */}
                  <SeatRow ids={['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']} />

                  {/* ── WALL (bottom) ── */}


                </div>
              </div>

              {/* ════ RIGHT SIDE (hidden on mobile) ════ */}
              {!isMobile && (
                <div className="flex" style={{ marginLeft: -2 }}>

                  {/* Right wall of gaming room with 2 door openings */}
                  <div className="flex flex-col relative" style={{ width: 8 }}>
                    {/* Wall segment above Dveře 1 */}
                    <div className="bg-[var(--nest-border)]" style={{ height: 80 }}></div>
                    {/* Dveře 1 opening */}
                    <div className="bg-amber-900/50 flex items-center justify-center" style={{ height: 50 }}>
                      <span className="text-[8px] font-bold text-amber-400/70" style={{ writingMode: 'vertical-lr' }}>D1</span>
                    </div>
                    {/* Wall segment between doors — longer to push D2 lower */}
                    <div className="bg-[var(--nest-border)] flex-1" style={{ minHeight: 200 }}></div>
                    {/* Dveře 2 opening — lower, near Deskovky */}
                    <div className="bg-amber-900/50 flex items-center justify-center" style={{ height: 50 }}>
                      <span className="text-[8px] font-bold text-amber-400/70" style={{ writingMode: 'vertical-lr' }}>D2</span>
                    </div>
                    {/* Wall segment below Dveře 2 */}
                    <div className="bg-[var(--nest-border)]" style={{ height: 150 }}></div>
                  </div>

                  {/* Corridor + gap + Deskovky stacked vertically */}
                  <div className="flex flex-col">

                    {/* Chodba + Vchod side by side */}
                    <div className="flex">
                      {/* Chodba */}
                      <div className="flex items-center justify-center border-2 border-l-0 border-[var(--nest-border)] bg-[var(--nest-surface)]" style={{ width: 330, height: 150 }}>
                        <span className="text-sm font-semibold text-[var(--nest-text-tertiary)] tracking-wider">Chodba</span>
                      </div>
                      {/* Vchod — aligned with Chodba, entrance leads into corridor */}
                      <div className="flex items-center justify-center border-2 border-l-0 border-[var(--nest-border)] bg-[var(--nest-surface-alt)] text-[var(--nest-text-secondary)] rounded-r-lg" style={{ width: 36, height: 150 }}>
                        <span className="text-[9px] font-bold tracking-wider" style={{ writingMode: 'vertical-lr' }}>VCHOD</span>
                      </div>
                    </div>

                    {/* Gap / volný prostor — flex-1 pushes Deskovky to bottom */}
                    <div className="flex-1" style={{ minHeight: 110 }}></div>

                    {/* Deskovky — wide rectangle */}
                    <div className="flex items-center justify-center border-2 border-[var(--nest-border)] bg-indigo-900/20 rounded-lg" style={{ width: 330, height: 300 }}>
                      <div className="text-center">
                        <div className="text-3xl mb-2">🎲</div>
                        <span className="text-lg font-semibold text-indigo-400/70">Deskovky</span>
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
        <div className="mt-6 bg-[var(--nest-yellow)]/10 rounded-2xl shadow-xl border border-[var(--nest-yellow)]/20 p-5">
          <h3 className="font-bold text-[var(--nest-yellow)] mb-3 text-sm">🎯 Tvoje rezervace ({selectedGuest.name})</h3>
          <div className="flex flex-wrap gap-2">
            {myReservations.map(r => (
              <span key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--nest-yellow)]/15 border border-[var(--nest-yellow)]/30 text-[var(--nest-yellow)] text-sm font-semibold">
                <Armchair className="w-4 h-4" /> {r.seat_id}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Confirm Modal */}
      {
        showConfirm && selectedSeat && selectedGuest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--nest-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-[var(--nest-text-primary)] mb-4">Potvrdit rezervaci</h3>
              <div className="bg-[var(--nest-yellow)]/10 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--nest-text-secondary)]">Místo:</span>
                    <span className="font-bold text-[var(--nest-yellow)]">{selectedSeat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--nest-text-secondary)]">Host:</span>
                    <span className="font-bold text-[var(--nest-text-primary)]">{selectedGuest.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowConfirm(false); setSelectedSeat(null) }}
                  disabled={submitting}
                  className="flex-1 bg-[var(--nest-surface-alt)] hover:bg-[var(--nest-border)] text-[var(--nest-text-primary)] px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >Zrušit</button>
                <button
                  onClick={handleReserve}
                  disabled={submitting}
                  className="flex-1 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] disabled:bg-[var(--nest-border)] text-[var(--nest-bg)] px-6 py-3 rounded-lg font-semibold transition-colors"
                >{submitting ? 'Rezervuji...' : 'Potvrdit'}</button>
              </div>
            </div>
          </div>
        )
      }
    </NestPage >
  )
}
