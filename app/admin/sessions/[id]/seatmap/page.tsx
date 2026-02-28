'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Armchair, Monitor, Cpu, Gamepad2, User, Printer, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { useAdminAuth } from '@/lib/admin-auth-context'
import { canViewFinances } from '@/lib/admin-roles'

interface SeatReservation {
    id: string
    seat_id: string
    guest_id: string
    guest_name: string
}

interface HardwareReservation {
    id: string
    guest_id: string
    hardware_item_id: string
    quantity: number
    nights_count: number
    total_price: number
}

interface HardwareItem {
    id: string
    name: string
    type: 'monitor' | 'pc' | 'accessory'
    category: string
}

interface Guest {
    id: string
    name: string
    dietary_restrictions?: string
    notes?: string
}

interface GameInstallRequest {
    guest_id: string
    game_names: string[]
}

const ALL_SEATS = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
    'E1', 'E2', 'E3', 'E4', 'E5', 'E6',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8',
]

export default function AdminSeatMapPage() {
    const router = useRouter()
    const params = useParams()
    const sessionId = params?.id as string
    const { role } = useAdminAuth()
    const showFinances = role ? canViewFinances(role) : false

    const [session, setSession] = useState<Session | null>(null)
    const [guests, setGuests] = useState<Guest[]>([])
    const [seatReservations, setSeatReservations] = useState<SeatReservation[]>([])
    const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([])
    const [hardwareReservations, setHardwareReservations] = useState<HardwareReservation[]>([])
    const [gameInstallRequests, setGameInstallRequests] = useState<GameInstallRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
    const [hwPrepared, setHwPrepared] = useState<Record<string, string>>({})
    const [gamesPrepared, setGamesPrepared] = useState<Record<string, string>>({})

    const planContainerRef = useRef<HTMLDivElement>(null)
    const planContentRef = useRef<HTMLDivElement>(null)
    const [planScale, setPlanScale] = useState(1)

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
        } else {
            fetchData()
        }
    }, [sessionId, router])

    // Auto-scale
    useEffect(() => {
        if (!planContainerRef.current || !planContentRef.current) return
        const updateScale = () => {
            const container = planContainerRef.current
            const content = planContentRef.current
            if (!container || !content) return
            const availableWidth = container.offsetWidth
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
            const token = localStorage.getItem('admin_token')

            // Fetch session
            const sessionRes = await fetch(`/api/admin/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            let fetchedSlug = sessionId
            if (sessionRes.ok) {
                const data = await sessionRes.json()
                setSession(data.session)
                fetchedSlug = data.session?.slug || sessionId
            }

            // Fetch guests
            const guestsRes = await fetch(`/api/event/${fetchedSlug}/guests`)
            if (guestsRes.ok) {
                const data = await guestsRes.json()
                setGuests(data.guests || [])
            }

            // Fetch seat reservations
            const seatsRes = await fetch(`/api/seats/reservations?session_id=${sessionId}`)
            if (seatsRes.ok) {
                const seatsData = await seatsRes.json()
                setSeatReservations(seatsData.reservations || [])
            }

            // Fetch hardware items
            const hwRes = await fetch('/api/hardware/items')
            if (hwRes.ok) {
                const hwData = await hwRes.json()
                setHardwareItems(hwData.items || [])
            }

            // Fetch hardware reservations
            const hwReservRes = await fetch(`/api/admin/sessions/${sessionId}/reservations`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (hwReservRes.ok) {
                const hwReservData = await hwReservRes.json()
                setHardwareReservations(hwReservData.reservations || [])
            }

            // Fetch game install requests
            const installRes = await fetch(`/api/game-installs?session_id=${sessionId}`)
            if (installRes.ok) {
                const installData = await installRes.json()
                setGameInstallRequests(installData.requests || [])
            }

            // Fetch prepared state
            const prepRes = await fetch(`/api/admin/sessions/${sessionId}/prepared`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (prepRes.ok) {
                const prepData = await prepRes.json()
                setHwPrepared(prepData.hw_prepared || {})
                setGamesPrepared(prepData.games_prepared || {})
            }
        } catch (error) {
            console.error('Error fetching seat map data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Helpers
    const getSeatReservation = (seatId: string) => seatReservations.find(r => r.seat_id === seatId)
    const getGuest = (guestId: string) => guests.find(g => g.id === guestId)
    const getGuestHardware = (guestId: string) => {
        return hardwareReservations
            .filter(r => r.guest_id === guestId)
            .map(r => {
                const item = hardwareItems.find(h => h.id === r.hardware_item_id)
                return { ...r, itemName: item?.name || 'Neznámé', itemType: item?.type || 'accessory', category: item?.category || '' }
            })
    }
    const getGuestGameInstalls = (guestId: string) => {
        const req = gameInstallRequests.find(r => r.guest_id === guestId)
        return req?.game_names || []
    }

    const togglePrepared = async (guestId: string, type: 'hw' | 'games') => {
        const current = type === 'hw' ? hwPrepared : gamesPrepared
        const isPrepared = !!current[guestId]
        try {
            const token = localStorage.getItem('admin_token')
            const res = await fetch(`/api/admin/sessions/${sessionId}/prepared`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ guest_id: guestId, type, prepared: !isPrepared }),
            })
            if (res.ok) {
                const data = await res.json()
                setHwPrepared(data.hw_prepared || {})
                setGamesPrepared(data.games_prepared || {})
            }
        } catch (e) {
            console.error('Error toggling prepared state:', e)
        }
    }

    // Stats
    const reservedSeats = seatReservations.length
    const availableSeats = ALL_SEATS.length - reservedSeats

    // Seat cell dimensions
    const CELL_W = 110
    const CELL_H = 72
    const GAP = 6

    const SeatCell = ({ id }: { id: string }) => {
        const reservation = getSeatReservation(id) as any
        const isSelected = selectedSeat === id
        const isAutoReserved = reservation?.auto_reserved
        const isCoffee = reservation?.guest_id === '__coffee__'
        const guestHw = (reservation && !isAutoReserved && !isCoffee) ? getGuestHardware(reservation.guest_id) : []
        const hasPc = guestHw.some(h => h.itemType === 'pc')
        const hasMonitor = guestHw.some(h => h.itemType === 'monitor')
        const isHwReady = reservation && !isAutoReserved && !isCoffee && !!hwPrepared[reservation.guest_id]
        const isGamesReady = reservation && !isAutoReserved && !isCoffee && !!gamesPrepared[reservation.guest_id]
        const isFullyReady = reservation && !isAutoReserved && !isCoffee && (guestHw.length === 0 || isHwReady) && (getGuestGameInstalls(reservation.guest_id).length === 0 || isGamesReady)

        return (
            <button
                onClick={() => setSelectedSeat(isSelected ? null : id)}
                className={`
          relative flex flex-col items-center justify-center rounded-md font-bold transition-all duration-150
          ${isCoffee
                        ? 'bg-amber-800/40 text-amber-200/80 border-2 border-solid border-amber-600/50'
                        : reservation
                            ? isAutoReserved
                                ? isSelected
                                    ? 'bg-amber-600/25 border-2 border-dashed border-amber-400/60 shadow-lg scale-105'
                                    : 'bg-amber-900/25 text-white/60 border-2 border-dashed border-amber-500/30 hover:border-amber-400/60'
                                : isFullyReady
                                    ? isSelected
                                        ? 'bg-emerald-600/40 border-2 border-solid border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105'
                                        : 'bg-emerald-900/50 text-white/90 border-2 border-solid border-emerald-600/60 hover:border-emerald-400 hover:bg-emerald-800/60'
                                    : isSelected
                                        ? 'bg-amber-600/40 border-2 border-solid border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                                        : 'bg-red-900/50 text-white/90 border-2 border-solid border-red-700/60 hover:border-amber-400 hover:bg-red-800/60'
                            : 'bg-emerald-700/40 text-white/60 border-2 border-solid border-emerald-600/50'
                    }
        `}
                style={{ width: CELL_W, height: CELL_H }}
                title={isCoffee ? `${id}: ☕ Kafe (rezervováno)` : reservation ? `${id}: ${reservation.guest_name}${isAutoReserved ? ' (auto)' : ''}${isFullyReady ? ' ✅' : ''}` : `${id}: Volné`}
            >
                {/* Prepared badge */}
                {isFullyReady && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                    </span>
                )}
                <span className="text-[10px] font-extrabold leading-none opacity-60">{id}</span>
                {isCoffee ? (
                    <>
                        <span className="text-lg mt-0.5">☕</span>
                        <span className="text-[9px] font-bold opacity-70">Kafe</span>
                    </>
                ) : reservation ? (
                    <>
                        <span className="text-[11px] font-bold max-w-[100px] leading-tight mt-0.5 text-center truncate">{reservation.guest_name}</span>
                        {isAutoReserved ? (
                            <span className="text-[8px] opacity-40 mt-0.5">auto</span>
                        ) : (
                            <div className="flex gap-1 mt-0.5">
                                {hasPc && <Cpu className="w-3 h-3 text-blue-400" />}
                                {hasMonitor && <Monitor className="w-3 h-3 text-purple-400" />}
                                {guestHw.filter(h => h.itemType === 'accessory').length > 0 && <Gamepad2 className="w-3 h-3 text-green-400" />}
                            </div>
                        )}
                    </>
                ) : (
                    <span className="text-[10px] font-medium opacity-40 mt-1">volné</span>
                )}
            </button>
        )
    }

    const SeatRow = ({ ids }: { ids: string[] }) => {
        // Group seats into pairs (tables of 2)
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

    const Aisle = ({ count }: { count: number }) => (
        <div className="flex" style={{ gap: 11 }}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center justify-center text-[var(--nest-text-tertiary)] text-sm font-bold" style={{ width: CELL_W, height: 36 }}>
                    ↕
                </div>
            ))}
        </div>
    )

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

    // Detail panel for selected seat
    const renderSeatDetail = () => {
        if (!selectedSeat) return null
        const reservation = getSeatReservation(selectedSeat)

        if (!reservation) {
            return (
                <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--nest-surface)', borderColor: 'var(--nest-border)' }}>
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--nest-text-primary)' }}>
                        <Armchair className="w-5 h-5 inline mr-2 text-emerald-400" />
                        Místo {selectedSeat}
                    </h3>
                    <p className="text-emerald-400 font-medium">✅ Volné — žádná rezervace</p>
                </div>
            )
        }

        const reservationData = reservation as any
        const isAutoReserved = reservationData?.auto_reserved
        const guest = getGuest(reservation.guest_id)
        const hw = isAutoReserved ? [] : getGuestHardware(reservation.guest_id)
        const gameInstalls = isAutoReserved ? [] : getGuestGameInstalls(reservation.guest_id)
        const pcs = hw.filter(h => h.itemType === 'pc')
        const monitors = hw.filter(h => h.itemType === 'monitor')
        const accessories = hw.filter(h => h.itemType === 'accessory')

        return (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', borderColor: 'var(--nest-border)' }}>
                {/* Header */}
                <div className="px-6 py-4" style={{ background: isAutoReserved ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))' : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))' }}>
                    <h3 className="text-xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                        <Armchair className="w-5 h-5 inline mr-2 text-amber-400" />
                        Místo {selectedSeat}
                        {isAutoReserved && (
                            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px dashed rgba(245,158,11,0.4)' }}>auto-rezervace</span>
                        )}
                    </h3>
                    <p className="text-lg font-semibold mt-1" style={{ color: '#fbbf24' }}>
                        <User className="w-4 h-4 inline mr-1" />
                        {reservation.guest_name}
                    </p>
                    {isAutoReserved && (
                        <p className="text-xs mt-2" style={{ color: 'var(--nest-text-tertiary)' }}>
                            ℹ️ Automaticky rezervované místo — technika je na hlavním místě hosta
                        </p>
                    )}
                </div>

                <div className="p-6 space-y-5">
                    {/* Preparation status toggles */}
                    {!isAutoReserved && (hw.length > 0 || gameInstalls.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {hw.length > 0 && (
                                <button
                                    onClick={() => togglePrepared(reservation.guest_id, 'hw')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${hwPrepared[reservation.guest_id]
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                    style={!hwPrepared[reservation.guest_id] ? { color: 'var(--nest-text-secondary)' } : undefined}
                                >
                                    {hwPrepared[reservation.guest_id]
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        : <Circle className="w-4 h-4" />
                                    }
                                    HW nachystáno
                                </button>
                            )}
                            {gameInstalls.length > 0 && (
                                <button
                                    onClick={() => togglePrepared(reservation.guest_id, 'games')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${gamesPrepared[reservation.guest_id]
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                    style={!gamesPrepared[reservation.guest_id] ? { color: 'var(--nest-text-secondary)' } : undefined}
                                >
                                    {gamesPrepared[reservation.guest_id]
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        : <Circle className="w-4 h-4" />
                                    }
                                    Hry nainstalovány
                                </button>
                            )}
                        </div>
                    )}

                    {/* Hardware */}
                    <div>
                        <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--nest-text-secondary)' }}>
                            <Monitor className="w-4 h-4 text-blue-400" />
                            Půjčená technika
                        </h4>
                        {hw.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--nest-text-tertiary)' }}>Bez techniky — vlastní vybavení</p>
                        ) : (
                            <div className="space-y-1.5">
                                {pcs.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                        <Cpu className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <span className="font-medium" style={{ color: 'var(--nest-text-primary)' }}>{h.itemName}</span>
                                        <span className="ml-auto text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>{h.quantity}× • {h.nights_count} nocí</span>
                                        {showFinances && <span className="font-bold text-blue-400">{h.total_price} Kč</span>}
                                    </div>
                                ))}
                                {monitors.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}>
                                        <Monitor className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span className="font-medium" style={{ color: 'var(--nest-text-primary)' }}>{h.itemName}</span>
                                        <span className="ml-auto text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>{h.quantity}× • {h.nights_count} nocí</span>
                                        {showFinances && <span className="font-bold text-purple-400">{h.total_price} Kč</span>}
                                    </div>
                                ))}
                                {accessories.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                        <Gamepad2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                        <span className="font-medium" style={{ color: 'var(--nest-text-primary)' }}>{h.itemName}</span>
                                        <span className="ml-auto text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>{h.quantity}× • {h.nights_count} nocí</span>
                                        {showFinances && <span className="font-bold text-green-400">{h.total_price} Kč</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Game installs */}
                    {gameInstalls.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--nest-text-secondary)' }}>
                                <Gamepad2 className="w-4 h-4 text-amber-400" />
                                Hry k předinstalaci
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {gameInstalls.map((game, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                        🎮 {game}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Guest notes */}
                    {guest?.dietary_restrictions && (
                        <div>
                            <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--nest-text-secondary)' }}>🍽️ Dietní omezení</h4>
                            <p className="text-sm" style={{ color: 'var(--nest-text-primary)' }}>{guest.dietary_restrictions}</p>
                        </div>
                    )}
                    {guest?.notes && (
                        <div>
                            <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--nest-text-secondary)' }}>📝 Poznámky</h4>
                            <p className="text-sm" style={{ color: 'var(--nest-text-primary)' }}>{guest.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nest-text-secondary)' }} />
            </div>
        )
    }

    return (
        <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href={`/admin/sessions/${sessionId}`}
                        className="inline-flex items-center gap-2 mb-4"
                        style={{ color: 'var(--nest-text-secondary)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Zpět na detail eventu
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--nest-text-primary)' }}>
                                <Armchair className="w-8 h-8 text-amber-400" />
                                Mapa míst — Příprava
                            </h1>
                            {session && (
                                <p className="mt-1" style={{ color: 'var(--nest-text-secondary)' }}>
                                    {session.name} • {formatDate(session.start_date)}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition"
                            style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                        >
                            <Printer className="w-4 h-4" />
                            Tisk
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="rounded-xl p-4 mb-6 flex flex-wrap gap-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>Volných: <strong className="text-emerald-400">{availableSeats}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>Obsazených: <strong className="text-red-400">{reservedSeats}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-blue-400" />
                        <span className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>= půjčené PC</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Monitor className="w-3 h-3 text-purple-400" />
                        <span className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>= půjčený monitor</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Gamepad2 className="w-3 h-3 text-green-400" />
                        <span className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>= příslušenství</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>= připraveno</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Floor Plan */}
                    <div className="xl:col-span-2 rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <div className="px-6 py-3" style={{ background: 'linear-gradient(to right, #d97706, #b45309)' }}>
                            <h2 className="text-xl font-bold text-white">🗺️ Plán místnosti</h2>
                            <p className="text-amber-200/70 text-xs">Klikni na místo pro zobrazení detailů</p>
                        </div>
                        <div className="p-4 md:p-6 overflow-hidden" ref={planContainerRef}>
                            <div
                                style={{
                                    transform: `scale(${planScale})`,
                                    transformOrigin: 'top left',
                                    height: planContentRef.current ? planContentRef.current.scrollHeight * planScale : 'auto',
                                }}
                            >
                                <div className="inline-block min-w-max" ref={planContentRef}>
                                    <div className="flex items-stretch">
                                        {/* Main room */}
                                        <div className="border-2 rounded-l-xl relative" style={{ borderColor: 'var(--nest-border)', backgroundColor: 'var(--nest-bg)', padding: '16px 20px' }}>
                                            <div className="absolute top-0 left-0 right-0 text-center py-1.5 rounded-tl-lg" style={{ backgroundColor: 'var(--nest-surface-alt)', color: 'var(--nest-text-primary)', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                                                Nest — nová herní místnost
                                            </div>
                                            <div style={{ marginTop: 28 }}>

                                                <SeatRow ids={['A1', 'A2', 'A3', 'A4', 'A5', 'A6']} />
                                                <Aisle count={6} />
                                                <SeatRow ids={['B1', 'B2', 'B3', 'B4', 'B5', 'B6']} />
                                                <div className="flex justify-start my-0.5"><TableBar /></div>
                                                <SeatRow ids={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']} />
                                                <Aisle count={6} />
                                                <SeatRow ids={['D1', 'D2', 'D3', 'D4', 'D5', 'D6']} />
                                                <div className="flex justify-start my-0.5"><TableBar /></div>
                                                <SeatRow ids={['E1', 'E2', 'E3', 'E4', 'E5', 'E6']} />
                                                <Aisle count={8} />
                                                <SeatRow ids={['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']} />

                                            </div>
                                        </div>

                                        {/* Right side - corridor & board games */}
                                        <div className="hidden md:flex" style={{ marginLeft: -2 }}>
                                            <div className="flex flex-col relative" style={{ width: 8 }}>
                                                <div style={{ height: 80, backgroundColor: 'var(--nest-border)' }}></div>
                                                <div className="flex items-center justify-center bg-amber-900/50" style={{ height: 50 }}>
                                                    <span className="text-[8px] font-bold text-amber-400/70" style={{ writingMode: 'vertical-lr' }}>D1</span>
                                                </div>
                                                <div className="flex-1" style={{ minHeight: 200, backgroundColor: 'var(--nest-border)' }}></div>
                                                <div className="flex items-center justify-center bg-amber-900/50" style={{ height: 50 }}>
                                                    <span className="text-[8px] font-bold text-amber-400/70" style={{ writingMode: 'vertical-lr' }}>D2</span>
                                                </div>
                                                <div style={{ height: 150, backgroundColor: 'var(--nest-border)' }}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex">
                                                    <div className="flex items-center justify-center border-2 border-l-0" style={{ width: 280, height: 150, borderColor: 'var(--nest-border)', backgroundColor: 'var(--nest-surface)' }}>
                                                        <span className="text-sm font-semibold tracking-wider" style={{ color: 'var(--nest-text-tertiary)' }}>Chodba</span>
                                                    </div>
                                                    <div className="flex items-center justify-center border-2 border-l-0 rounded-r-lg" style={{ width: 36, height: 150, borderColor: 'var(--nest-border)', backgroundColor: 'var(--nest-surface-alt)' }}>
                                                        <span className="text-[9px] font-bold tracking-wider" style={{ writingMode: 'vertical-lr', color: 'var(--nest-text-secondary)' }}>VCHOD</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1" style={{ minHeight: 110 }}></div>
                                                <div className="flex items-center justify-center border-2 rounded-lg bg-indigo-900/20" style={{ width: 280, height: 250, borderColor: 'var(--nest-border)' }}>
                                                    <div className="text-center">
                                                        <div className="text-3xl mb-2">🎲</div>
                                                        <span className="text-lg font-semibold text-indigo-400/70">Deskovky</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detail panel */}
                    <div className="xl:col-span-1">
                        {selectedSeat ? (
                            renderSeatDetail()
                        ) : (
                            <div className="rounded-xl p-6 border text-center" style={{ backgroundColor: 'var(--nest-surface)', borderColor: 'var(--nest-border)' }}>
                                <Armchair className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--nest-text-tertiary)' }} />
                                <p className="font-medium" style={{ color: 'var(--nest-text-secondary)' }}>Klikni na místo v mapě</p>
                                <p className="text-sm mt-1" style={{ color: 'var(--nest-text-tertiary)' }}>Zobrazí se podrobnosti o hostovi, technice a hrách</p>
                            </div>
                        )}

                        {/* Full guest list */}
                        <div className="rounded-xl border overflow-hidden mt-6" style={{ backgroundColor: 'var(--nest-surface)', borderColor: 'var(--nest-border)' }}>
                            <div className="px-5 py-3" style={{ background: 'linear-gradient(to right, #7c3aed, #6d28d9)' }}>
                                <h3 className="font-bold text-white">👥 Přehled obsazení ({reservedSeats}/{ALL_SEATS.length})</h3>
                            </div>
                            <div className="divide-y" style={{ borderColor: 'var(--nest-border)' }}>
                                {seatReservations.length === 0 ? (
                                    <div className="p-4 text-center" style={{ color: 'var(--nest-text-tertiary)' }}>
                                        Zatím žádné rezervace
                                    </div>
                                ) : (
                                    seatReservations
                                        .sort((a, b) => a.seat_id.localeCompare(b.seat_id))
                                        .map(res => {
                                            const resData = res as any
                                            const isAuto = resData.auto_reserved
                                            const hw = isAuto ? [] : getGuestHardware(res.guest_id)
                                            const gameInstalls = isAuto ? [] : getGuestGameInstalls(res.guest_id)
                                            return (
                                                <button
                                                    key={res.id}
                                                    onClick={() => setSelectedSeat(res.seat_id)}
                                                    className={`w-full text-left px-5 py-3 transition-colors ${selectedSeat === res.seat_id ? 'bg-amber-500/10' : 'hover:bg-white/5'}`}
                                                    style={{ borderColor: 'var(--nest-border)' }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold px-2 py-0.5 rounded" style={{ backgroundColor: isAuto ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.15)', color: isAuto ? 'rgba(251,191,36,0.5)' : '#fbbf24', minWidth: 32, textAlign: 'center', border: isAuto ? '1px dashed rgba(245,158,11,0.3)' : 'none' }}>
                                                            {res.seat_id}
                                                        </span>
                                                        <span className="font-semibold text-sm" style={{ color: isAuto ? 'var(--nest-text-tertiary)' : 'var(--nest-text-primary)' }}>{res.guest_name}</span>
                                                        <div className="flex gap-1 ml-auto">
                                                            {isAuto ? (
                                                                <span className="text-[10px] opacity-40">auto</span>
                                                            ) : (
                                                                <>
                                                                    {(() => {
                                                                        const isReady = (hw.length === 0 || !!hwPrepared[res.guest_id]) && (gameInstalls.length === 0 || !!gamesPrepared[res.guest_id])
                                                                        return isReady ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null
                                                                    })()}
                                                                    {hw.some(h => h.itemType === 'pc') && <Cpu className="w-3.5 h-3.5 text-blue-400" />}
                                                                    {hw.some(h => h.itemType === 'monitor') && <Monitor className="w-3.5 h-3.5 text-purple-400" />}
                                                                    {hw.some(h => h.itemType === 'accessory') && <Gamepad2 className="w-3.5 h-3.5 text-green-400" />}
                                                                    {gameInstalls.length > 0 && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                                                                            {gameInstalls.length}🎮
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kompletní soupis techniky */}
                {hardwareReservations.length > 0 && (() => {
                    // Aggregate hardware by item
                    const itemMap: Record<string, { name: string; type: string; category: string; totalQty: number; guests: { name: string; qty: number; seatId: string }[] }> = {}
                    hardwareReservations.forEach(r => {
                        const hw = hardwareItems.find(h => h.id === r.hardware_item_id)
                        if (!hw) return
                        if (!itemMap[r.hardware_item_id]) {
                            itemMap[r.hardware_item_id] = { name: hw.name, type: hw.type, category: hw.category, totalQty: 0, guests: [] }
                        }
                        itemMap[r.hardware_item_id].totalQty += (r.quantity || 1)
                        const guest = guests.find(g => g.id === r.guest_id)
                        const seat = seatReservations.find(s => s.guest_id === r.guest_id)
                        itemMap[r.hardware_item_id].guests.push({
                            name: guest?.name || 'Neznámý',
                            qty: r.quantity || 1,
                            seatId: seat?.seat_id || '—',
                        })
                    })

                    const typeOrder: Record<string, number> = { pc: 0, monitor: 1, accessory: 2 }
                    const typeLabels: Record<string, string> = { pc: '💻 Počítače', monitor: '📺 Monitory', accessory: '🎮 Příslušenství' }
                    const typeColors: Record<string, { bg: string; color: string; border: string }> = {
                        pc: { bg: 'rgba(59, 130, 246, 0.08)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' },
                        monitor: { bg: 'rgba(168, 85, 247, 0.08)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' },
                        accessory: { bg: 'rgba(34, 197, 94, 0.08)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' },
                    }

                    // Group items by type
                    const grouped: Record<string, typeof itemMap[string][]> = {}
                    Object.values(itemMap).forEach(item => {
                        if (!grouped[item.type]) grouped[item.type] = []
                        grouped[item.type].push(item)
                    })

                    // Sort types
                    const sortedTypes = Object.keys(grouped).sort((a, b) => (typeOrder[a] ?? 9) - (typeOrder[b] ?? 9))

                    // Unique games
                    const allGames = new Set<string>()
                    gameInstallRequests.forEach(req => {
                        (req.game_names || []).forEach((g: string) => allGames.add(g))
                    })

                    const totalItems = Object.values(itemMap).reduce((s, i) => s + i.totalQty, 0)

                    return (
                        <div className="mt-8 rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', borderColor: 'var(--nest-border)' }}>
                            <div className="px-6 py-4" style={{ background: 'linear-gradient(to right, #0369a1, #0e7490)' }}>
                                <h2 className="text-xl font-bold text-white">📋 Kompletní soupis techniky</h2>
                                <p className="text-cyan-200/70 text-sm mt-0.5">{totalItems} kusů celkem • {Object.keys(itemMap).length} různých položek</p>
                            </div>

                            <div className="p-6 space-y-6">
                                {sortedTypes.map(type => {
                                    const items = grouped[type]!
                                    const colors = typeColors[type] || typeColors.accessory
                                    const totalTypeQty = items.reduce((s, i) => s + i.totalQty, 0)
                                    return (
                                        <div key={type}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <h3 className="font-bold" style={{ color: colors.color }}>{typeLabels[type] || type}</h3>
                                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: colors.bg, color: colors.color, border: colors.border }}>
                                                    {totalTypeQty}×
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {items
                                                    .sort((a, b) => b.totalQty - a.totalQty)
                                                    .map(item => (
                                                        <div
                                                            key={item.name}
                                                            className="rounded-lg px-4 py-3"
                                                            style={{ backgroundColor: colors.bg, border: colors.border }}
                                                        >
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="font-semibold text-sm" style={{ color: 'var(--nest-text-primary)' }}>{item.name}</span>
                                                                <span className="font-bold text-sm" style={{ color: colors.color }}>{item.totalQty}×</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {item.guests
                                                                    .sort((a, b) => a.seatId.localeCompare(b.seatId))
                                                                    .map((g, i) => (
                                                                        <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--nest-text-secondary)', border: '1px solid var(--nest-border)' }}>
                                                                            <strong style={{ color: '#fbbf24' }}>{g.seatId}</strong> {g.name}{g.qty > 1 ? ` (${g.qty}×)` : ''}
                                                                        </span>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Games summary */}
                                {allGames.size > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="font-bold" style={{ color: '#fbbf24' }}>🎮 Hry k instalaci</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                                {allGames.size} her
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[...allGames].sort().map(game => {
                                                // Count how many guests want this game
                                                const requestCount = gameInstallRequests.filter(r => (r.game_names || []).includes(game)).length
                                                return (
                                                    <span key={game} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                                        🎮 {game}
                                                        {requestCount > 1 && (
                                                            <span className="text-[10px] opacity-60">({requestCount}×)</span>
                                                        )}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
