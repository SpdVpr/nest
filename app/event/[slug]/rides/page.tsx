'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Car, Plus, Loader2, Trash2, UserPlus, UserMinus, MapPin, Clock, Users, Calendar } from 'lucide-react'
import NestPage from '@/components/NestPage'
import { Session, Ride, RidePassenger } from '@/types/database.types'
import { useCurrentGuest } from '@/lib/auth-context'
import NestLoading from '@/components/NestLoading'

export default function EventRidesPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [session, setSession] = useState<Session | null>(null)
    const [rides, setRides] = useState<Ride[]>([])
    const [passengers, setPassengers] = useState<RidePassenger[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [actionId, setActionId] = useState<string | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form state
    const [departureDate, setDepartureDate] = useState('')
    const [departureTime, setDepartureTime] = useState('')
    const [origin, setOrigin] = useState('')
    const [totalSeats, setTotalSeats] = useState(3)
    const [formError, setFormError] = useState('')

    const currentGuest = useCurrentGuest(slug)

    useEffect(() => {
        if (slug) fetchData()
    }, [slug])

    const fetchData = async () => {
        try {
            setLoading(true)

            const sessionRes = await fetch(`/api/event/${slug}`)
            if (sessionRes.ok) {
                const data = await sessionRes.json()
                setSession(data.session)
            }

            const ridesRes = await fetch(`/api/event/${slug}/rides`)
            if (ridesRes.ok) {
                const data = await ridesRes.json()
                setRides(data.rides || [])
                setPassengers(data.passengers || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!currentGuest) return

        setFormError('')

        if (!departureDate || !departureTime || !origin.trim()) {
            setFormError('Vyplň všechna pole')
            return
        }

        try {
            setSubmitting(true)
            const res = await fetch(`/api/event/${slug}/rides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    guest_id: currentGuest.id,
                    driver_name: currentGuest.name,
                    departure_date: departureDate,
                    departure_time: departureTime,
                    origin: origin.trim(),
                    total_seats: totalSeats,
                }),
            })

            if (res.ok) {
                setDepartureDate('')
                setDepartureTime('')
                setOrigin('')
                setTotalSeats(3)
                await fetchData()
            } else {
                const data = await res.json()
                setFormError(data.error || 'Nepodařilo se vytvořit jízdu')
            }
        } catch (error) {
            console.error('Error creating ride:', error)
            setFormError('Nepodařilo se vytvořit jízdu')
        } finally {
            setSubmitting(false)
        }
    }

    const handleJoin = async (rideId: string) => {
        if (!currentGuest) return

        try {
            setActionId(rideId)
            const res = await fetch(`/api/event/${slug}/rides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'join',
                    guest_id: currentGuest.id,
                    guest_name: currentGuest.name,
                    ride_id: rideId,
                }),
            })

            if (res.ok) {
                await fetchData()
            }
        } catch (error) {
            console.error('Error joining ride:', error)
        } finally {
            setActionId(null)
        }
    }

    const handleLeave = async (rideId: string) => {
        if (!currentGuest) return

        try {
            setActionId(rideId)
            const res = await fetch(`/api/event/${slug}/rides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'leave',
                    guest_id: currentGuest.id,
                    ride_id: rideId,
                }),
            })

            if (res.ok) {
                await fetchData()
            }
        } catch (error) {
            console.error('Error leaving ride:', error)
        } finally {
            setActionId(null)
        }
    }

    const handleDelete = async (rideId: string) => {
        if (!currentGuest) return

        try {
            setActionId(rideId)
            const res = await fetch(`/api/event/${slug}/rides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    guest_id: currentGuest.id,
                    ride_id: rideId,
                }),
            })

            if (res.ok) {
                setDeleteConfirmId(null)
                await fetchData()
            }
        } catch (error) {
            console.error('Error deleting ride:', error)
        } finally {
            setActionId(null)
        }
    }

    const getPassengersForRide = (rideId: string) =>
        passengers.filter(p => p.ride_id === rideId)

    const isPassenger = (rideId: string) =>
        currentGuest ? passengers.some(p => p.ride_id === rideId && p.guest_id === currentGuest.id) : false

    const isDriver = (ride: Ride) =>
        currentGuest ? ride.driver_guest_id === currentGuest.id : false

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00')
        const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
        const day = dayNames[date.getDay()]
        return `${day} ${date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}`
    }

    // Generate event day options from session date range
    const eventDays = (() => {
        if (!session) return []
        const days: { value: string; label: string }[] = []
        const toLocalDate = (isoStr: string) => {
            const d = new Date(isoStr)
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${day}`
        }
        const startStr = toLocalDate(session.start_date)
        const endStr = session.end_date ? toLocalDate(session.end_date) : startStr
        const start = new Date(startStr + 'T12:00:00')
        const end = new Date(endStr + 'T12:00:00')
        const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const day = dayNames[d.getDay()]
            const label = `${day} ${d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}`
            days.push({ value: iso, label })
        }
        return days
    })()

    // Group rides by date
    const ridesByDate = rides.reduce((acc, ride) => {
        if (!acc[ride.departure_date]) acc[ride.departure_date] = []
        acc[ride.departure_date].push(ride)
        return acc
    }, {} as Record<string, Ride[]>)

    const sortedDates = Object.keys(ridesByDate).sort()

    if (loading) {
        return <NestLoading message="Načítám jízdy..." />
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)] flex items-center justify-center p-4">
                <div className="nest-card-elevated p-8 text-center max-w-md">
                    <p className="text-6xl mb-4">😕</p>
                    <h2 className="text-xl font-bold mb-2">Event nenalezen</h2>
                    <Link href="/" className="text-[var(--nest-yellow)] hover:underline font-medium">
                        ← Zpět na hlavní stránku
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Sdílené jízdy" maxWidth="max-w-2xl">

            {!currentGuest && (
                <div className="bg-[var(--nest-warning)]/10 border border-[var(--nest-warning)]/30 rounded-xl p-4 mb-6 text-center">
                    <p className="text-[var(--nest-warning)] font-medium text-sm">
                        Pro přidání nebo připojení k jízdě se nejdřív{' '}
                        <Link href={`/event/${slug}/register`} className="text-[var(--nest-yellow)] underline font-bold">
                            zaregistruj
                        </Link>
                    </p>
                </div>
            )}

            {/* Rides list */}
            {sortedDates.length > 0 ? (
                <div className="space-y-6 mb-8">
                    {sortedDates.map(date => (
                        <div key={date}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20">
                                    <Calendar className="w-4 h-4 text-[var(--nest-yellow)]" />
                                    <span className="text-sm font-bold text-[var(--nest-yellow)]">
                                        {formatDate(date)}
                                    </span>
                                </div>
                                <div className="flex-1 h-px bg-[var(--nest-border)]" />
                            </div>
                            <div className="space-y-3">
                                {ridesByDate[date].map(ride => {
                                    const ridePassengers = getPassengersForRide(ride.id)
                                    const seatsLeft = ride.total_seats - ridePassengers.length
                                    const iAmPassenger = isPassenger(ride.id)
                                    const iAmDriver = isDriver(ride)
                                    const isFull = seatsLeft <= 0

                                    return (
                                        <div
                                            key={ride.id}
                                            className={`bg-[var(--nest-surface)] border rounded-xl p-4 transition-all ${
                                                iAmDriver
                                                    ? 'border-[var(--nest-yellow)]/30'
                                                    : iAmPassenger
                                                    ? 'border-green-500/30'
                                                    : 'border-[var(--nest-border)]'
                                            }`}
                                        >
                                            {/* Header row */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-[var(--nest-text-primary)]">
                                                            {ride.driver_name}
                                                        </span>
                                                        {iAmDriver && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--nest-yellow)]/20 text-[var(--nest-yellow)] font-semibold">
                                                                tvoje jízda
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-[var(--nest-text-secondary)]">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {ride.departure_time}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {ride.origin}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Seats badge */}
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                    isFull
                                                        ? 'bg-red-500/15 text-red-400'
                                                        : seatsLeft === 1
                                                        ? 'bg-amber-500/15 text-amber-400'
                                                        : 'bg-green-500/15 text-green-400'
                                                }`}>
                                                    <Users className="w-3.5 h-3.5" />
                                                    {ridePassengers.length}/{ride.total_seats}
                                                </div>
                                            </div>

                                            {/* Passengers */}
                                            {ridePassengers.length > 0 && (
                                                <div className="mb-3 flex flex-wrap gap-1.5">
                                                    {ridePassengers.map(p => (
                                                        <span
                                                            key={p.id}
                                                            className={`text-xs px-2 py-1 rounded-lg ${
                                                                currentGuest && p.guest_id === currentGuest.id
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : 'bg-[var(--nest-surface-alt)] text-[var(--nest-text-secondary)]'
                                                            }`}
                                                        >
                                                            {p.guest_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {currentGuest && (
                                                <div className="flex items-center gap-2">
                                                    {iAmDriver ? (
                                                        <>
                                                            {deleteConfirmId === ride.id ? (
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <span className="text-xs text-red-400 flex-1">Opravdu smazat?</span>
                                                                    <button
                                                                        onClick={() => handleDelete(ride.id)}
                                                                        disabled={actionId === ride.id}
                                                                        className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg font-medium transition-all"
                                                                    >
                                                                        {actionId === ride.id ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : 'Smazat'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteConfirmId(null)}
                                                                        className="text-xs bg-[var(--nest-surface-alt)] text-[var(--nest-text-tertiary)] hover:text-[var(--nest-text-secondary)] px-3 py-1.5 rounded-lg transition-all"
                                                                    >
                                                                        Zrušit
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setDeleteConfirmId(ride.id)}
                                                                    className="text-xs flex items-center gap-1 text-[var(--nest-text-tertiary)] hover:text-red-400 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Smazat jízdu
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : iAmPassenger ? (
                                                        <button
                                                            onClick={() => handleLeave(ride.id)}
                                                            disabled={actionId === ride.id}
                                                            className="text-xs flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-medium transition-all"
                                                        >
                                                            {actionId === ride.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <UserMinus className="w-3.5 h-3.5" />
                                                                    Odhlásit se
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : !isFull ? (
                                                        <button
                                                            onClick={() => handleJoin(ride.id)}
                                                            disabled={actionId === ride.id}
                                                            className="text-xs flex items-center gap-1.5 bg-[var(--nest-yellow)]/10 text-[var(--nest-yellow)] hover:bg-[var(--nest-yellow)]/20 px-3 py-1.5 rounded-lg font-medium transition-all"
                                                        >
                                                            {actionId === ride.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                    Připojit se
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-[var(--nest-text-tertiary)]">Plno</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-[var(--nest-surface)] border border-dashed border-[var(--nest-border)] rounded-xl p-8 text-center mb-8">
                    <Car className="w-12 h-12 text-[var(--nest-text-tertiary)] mx-auto mb-3" />
                    <p className="text-[var(--nest-text-tertiary)] text-sm">Zatím žádné jízdy. Nabídni svezení!</p>
                </div>
            )}

            {/* Create ride form */}
            {currentGuest && (
                <div className="bg-[var(--nest-surface)] rounded-xl shadow-lg p-5 border border-[var(--nest-border)]">
                    <h3 className="font-bold text-[var(--nest-text-primary)] mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[var(--nest-yellow)]" />
                        Nabídnout jízdu
                    </h3>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[var(--nest-text-secondary)] mb-1 block">Den odjezdu</label>
                                <select
                                    value={departureDate}
                                    onChange={(e) => setDepartureDate(e.target.value)}
                                    className="w-full bg-[var(--nest-bg)] border border-[var(--nest-border)] rounded-xl px-4 py-3 text-[var(--nest-text-primary)] focus:ring-2 focus:ring-[var(--nest-yellow)]/50 focus:border-[var(--nest-yellow)]/50 outline-none"
                                >
                                    <option value="">Vyber den</option>
                                    {eventDays.map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--nest-text-secondary)] mb-1 block">Čas odjezdu</label>
                                <input
                                    type="time"
                                    value={departureTime}
                                    onChange={(e) => setDepartureTime(e.target.value)}
                                    className="w-full bg-[var(--nest-bg)] border border-[var(--nest-border)] rounded-xl px-4 py-3 text-[var(--nest-text-primary)] focus:ring-2 focus:ring-[var(--nest-yellow)]/50 focus:border-[var(--nest-yellow)]/50 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--nest-text-secondary)] mb-1 block">Odkud vyjíždíš</label>
                            <input
                                type="text"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                placeholder="např. Praha, Anděl"
                                className="w-full bg-[var(--nest-bg)] border border-[var(--nest-border)] rounded-xl px-4 py-3 text-[var(--nest-text-primary)] placeholder:text-[var(--nest-text-tertiary)] focus:ring-2 focus:ring-[var(--nest-yellow)]/50 focus:border-[var(--nest-yellow)]/50 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[var(--nest-text-secondary)] mb-1 block">Počet volných míst</label>
                            <input
                                type="number"
                                min={1}
                                max={8}
                                value={totalSeats}
                                onChange={(e) => setTotalSeats(parseInt(e.target.value) || 1)}
                                className="w-24 bg-[var(--nest-bg)] border border-[var(--nest-border)] rounded-xl px-4 py-3 text-[var(--nest-text-primary)] focus:ring-2 focus:ring-[var(--nest-yellow)]/50 focus:border-[var(--nest-yellow)]/50 outline-none"
                            />
                        </div>

                        {formError && (
                            <p className="text-red-400 text-sm">{formError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] disabled:bg-[var(--nest-border)] text-[var(--nest-bg)] px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Car className="w-5 h-5" />
                                    Přidat jízdu
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </NestPage>
    )
}
