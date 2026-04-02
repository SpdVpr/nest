'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Calendar, Pizza, MonitorSmartphone, Users, AlertCircle,
  Armchair, UtensilsCrossed, Gamepad2, Wallet, UserPlus, ChevronRight, Trophy, LogIn, UserCheck, BedDouble, Loader2, Sparkles, Car
} from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'
import EventChecklist from '@/components/EventChecklist'
import { useGuestAuth } from '@/lib/auth-context'
import { guestStorage } from '@/lib/guest-storage'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const { isAuthenticated, userProfile, getClaimedGuestForSession, firebaseUser, refreshProfile } = useGuestAuth()

  const [session, setSession] = useState<Session | null>(null)
  const [guestCount, setGuestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Checklist state
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null)
  const [seatReserved, setSeatReserved] = useState(false)
  const [hwReserved, setHwReserved] = useState(false)
  const [gamesVoted, setGamesVoted] = useState(false)

  // Inline claim state
  interface UnclaimedGuest {
    id: string
    name: string
    nights_count: number
    check_in_date?: string | null
    check_out_date?: string | null
  }
  const [unclaimedGuests, setUnclaimedGuests] = useState<UnclaimedGuest[]>([])
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimError, setClaimError] = useState('')
  const [claimedName, setClaimedName] = useState<string | null>(null)
  const [claimDismissed, setClaimDismissed] = useState(false)

  // Check localStorage for dismissed claim on this event
  useEffect(() => {
    if (typeof window === 'undefined' || !slug) return
    try {
      const dismissed = JSON.parse(localStorage.getItem('claim_dismissed') || '[]') as string[]
      if (dismissed.includes(slug)) {
        setClaimDismissed(true)
      }
    } catch { }
  }, [slug])

  const handleDismissClaim = () => {
    setClaimDismissed(true)
    try {
      const dismissed = JSON.parse(localStorage.getItem('claim_dismissed') || '[]') as string[]
      if (!dismissed.includes(slug)) {
        dismissed.push(slug)
        localStorage.setItem('claim_dismissed', JSON.stringify(dismissed))
      }
    } catch { }
  }

  useEffect(() => {
    if (slug) {
      fetchData()
    }
  }, [slug])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/event/${slug}`)

      if (response.status === 404) {
        setError('Event nebyl nalezen')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }

      const data = await response.json()
      setSession(data.session)

      const guestsResponse = await fetch(`/api/event/${slug}/guests`)
      let allGuests: Guest[] = []
      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json()
        allGuests = guestsData.guests || []
        setGuestCount(allGuests.length)
      }

      // Determine current guest (from auth context or local storage)
      const storedGuest = guestStorage.getCurrentGuest(slug)
      let myGuest: Guest | null = null
      if (storedGuest) {
        const candidate = allGuests.find((g: Guest) => g.id === storedGuest.id) || null
        // If user is authenticated, verify the stored guest actually belongs to them
        if (candidate && firebaseUser && candidate.user_id && candidate.user_id !== firebaseUser.uid) {
          // Stored guest was unclaimed or claimed by someone else — clear stale storage
          guestStorage.clearIfMatches(storedGuest.id)
        } else {
          myGuest = candidate
        }
      }
      setCurrentGuest(myGuest)

      // Fetch checklist data if we have a guest and a session
      if (myGuest && data.session) {
        const sessionId = data.session.id
        try {
          // Seats
          const seatsRes = await fetch(`/api/seats/reservations?session_id=${sessionId}`)
          if (seatsRes.ok) {
            const seatsData = await seatsRes.json()
            const mySeat = (seatsData.reservations || []).some((r: any) => r.guest_id === myGuest.id)
            setSeatReserved(mySeat)
          }

          // Hardware
          const hwRes = await fetch(`/api/hardware/reservations?session_id=${sessionId}`)
          if (hwRes.ok) {
            const hwData = await hwRes.json()
            const myHw = (hwData.reservations || []).some((r: any) => r.guest_id === myGuest.id && r.status === 'active')
            setHwReserved(myHw)
          }

          // Games - check if guest has any votes
          const gamesRes = await fetch(`/api/event/${slug}/games`)
          if (gamesRes.ok) {
            const gamesData = await gamesRes.json()
            const votes = gamesData.votes || []
            const hasVoted = votes.some((v: any) => v.guest_id === myGuest.id)
            setGamesVoted(hasVoted)
          }
        } catch {
          // Don't fail the page if checklist fetch fails
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Chyba při načítání eventu')
    } finally {
      setLoading(false)
    }
  }

  // Fetch unclaimed guests when authenticated user has no claimed guest for this event
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser || !session) return
    const claimed = getClaimedGuestForSession(session.id)
    if (claimed || currentGuest) return

    const fetchUnclaimed = async () => {
      try {
        const token = await firebaseUser.getIdToken()
        const res = await fetch(`/api/event/${slug}/unclaimed-guests`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUnclaimedGuests(data.guests || [])
        }
      } catch (err) {
        console.error('Failed to fetch unclaimed guests:', err)
      }
    }
    fetchUnclaimed()
  }, [isAuthenticated, firebaseUser, session, currentGuest])

  const handleClaim = async (guest: UnclaimedGuest) => {
    if (!firebaseUser) return
    setClaimingId(guest.id)
    setClaimError('')

    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ guest_id: guest.id }),
      })

      if (res.ok) {
        setClaimedName(guest.name)
        setUnclaimedGuests([])

        guestStorage.setCurrentGuest({
          id: guest.id,
          name: guest.name,
          session_slug: slug,
        })

        await refreshProfile()
        // Re-fetch event data to update currentGuest and checklist
        await fetchData()
      } else if (res.status === 409) {
        setClaimError('Tento účastník už byl spárován s jiným uživatelem.')
        // Refresh the unclaimed list
        setUnclaimedGuests(prev => prev.filter(g => g.id !== guest.id))
      } else {
        setClaimError('Párování selhalo. Zkus to znovu.')
      }
    } catch {
      setClaimError('Chyba při párování.')
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return <NestLoading message="Načítám event..." />
  }

  if (error || !session) {
    return (
      <NestPage title="Chyba">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="nest-card-elevated p-8 text-center max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-[var(--nest-error)] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Event nenalezen</h2>
            <p className="text-[var(--nest-white-60)] mb-6 text-sm">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-dark)] px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Zpět na seznam
            </Link>
          </div>
        </div>
      </NestPage>
    )
  }

  // Check if authenticated user has a claimed guest for this session
  const claimedGuest = session ? getClaimedGuestForSession(session.id) : null

  const navItems = [
    {
      href: `/event/${slug}/guests`,
      icon: Users,
      label: 'Lidé',
      desc: `${guestCount} registrovaných`,
    },
    {
      href: `/event/${slug}/snacks`,
      icon: Pizza,
      label: 'Občerstvení',
      desc: 'Jídlo a pití',
    },
    ...(session.hardware_enabled !== false ? [{
      href: `/event/${slug}/hardware`,
      icon: MonitorSmartphone,
      label: 'Hardware',
      desc: 'Rezervace HW',
    }] : []),
    {
      href: `/event/${slug}/costs`,
      icon: Wallet,
      label: 'Placení',
      desc: 'Přehled a platba',
      highlight: true,
    },
    ...(session.seats_enabled !== false ? [{
      href: `/event/${slug}/seats`,
      icon: Armchair,
      label: 'Místa',
      desc: 'Zasedací pořádek',
    }] : []),
    {
      href: `/event/${slug}/accommodation`,
      icon: BedDouble,
      label: 'Ubytování',
      desc: 'Výběr pokoje',
    },
    ...(session.menu_enabled ? [{
      href: `/event/${slug}/menu`,
      icon: UtensilsCrossed,
      label: 'Jídelníček',
      desc: 'Co je k jídlu',
    }] : []),
    {
      href: `/event/${slug}/games`,
      icon: Gamepad2,
      label: 'Hry',
      desc: 'Hlasování o hrách',
    },
    {
      href: `/event/${slug}/rides`,
      icon: Car,
      label: 'Sdílené jízdy',
      desc: 'Spolujízda na akci',
    },
    {
      href: '/records',
      icon: Trophy,
      label: 'Rekordy',
      desc: 'Síň slávy',
    },
  ]

  // Detect if today is the last day of the event
  const isLastDay = (() => {
    if (!session.end_date) return false
    const today = new Date()
    const endDate = new Date(session.end_date)
    return today.getFullYear() === endDate.getFullYear() &&
      today.getMonth() === endDate.getMonth() &&
      today.getDate() === endDate.getDate()
  })()

  return (
    <NestPage sessionSlug={slug} title={session.name}>
      {/* Glow animation for last day payment button */}
      {isLastDay && (
        <style>{`
          @keyframes paymentGlow {
            0%, 100% { box-shadow: 0 0 8px rgba(236, 72, 153, 0.4), 0 0 20px rgba(236, 72, 153, 0.2); }
            50% { box-shadow: 0 0 16px rgba(236, 72, 153, 0.6), 0 0 40px rgba(236, 72, 153, 0.3); }
          }
          .payment-glow {
            animation: paymentGlow 2s ease-in-out infinite;
            border-color: rgba(236, 72, 153, 0.6) !important;
            background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15)) !important;
          }
        `}</style>
      )}
      {/* Event Header */}
      <div className="text-center mb-8 pt-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          {session.name}
        </h1>

        {/* Date badge — prominent */}
        <div className="inline-flex items-center gap-2 bg-[var(--nest-dark-3)] border border-[var(--nest-dark-4)] rounded-xl px-4 py-2.5">
          <Calendar className="w-5 h-5 text-[var(--nest-yellow)]" />
          <span className="text-sm font-semibold text-[var(--nest-white)]">
            {formatEventRange(session.start_date, session.end_date, session.start_time, session.end_time)}
          </span>
        </div>

        {session.description && (
          <p className="mt-3 text-sm text-[var(--nest-white-60)] max-w-lg mx-auto whitespace-pre-line">
            {session.description}
          </p>
        )}
      </div>

      {/* Authenticated user badge */}
      {isAuthenticated && claimedGuest && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <UserCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-green-300">Přihlášen/a jako </span>
            <span className="text-sm font-semibold text-green-200">{claimedGuest.name}</span>
          </div>
        </div>
      )}

      {/* Inline Claim — for authenticated users who aren't paired with a guest on this event */}
      {isAuthenticated && !claimedGuest && !currentGuest && !claimDismissed && unclaimedGuests.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--nest-border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <UserCheck className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary, #fff)' }}>
                Spáruj svůj účet
              </h3>
              <p className="text-xs" style={{ color: 'var(--nest-text-tertiary, #666)' }}>
                Byl/a jsi na této akci? Najdi své jméno a spáruj ho.
              </p>
            </div>
          </div>

          {claimError && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
              {claimError}
            </div>
          )}

          {unclaimedGuests.map((guest, idx) => (
            <button
              key={guest.id}
              onClick={() => handleClaim(guest)}
              disabled={claimingId !== null}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--nest-yellow)]/5 disabled:opacity-50"
              style={idx < unclaimedGuests.length - 1 ? { borderBottom: '1px solid var(--nest-border)' } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--nest-dark-3, #2a2d37)' }}>
                  <Users className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--nest-text-primary, #fff)' }}>
                  {guest.name}
                </span>
              </div>
              {claimingId === guest.id ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--nest-yellow)' }} />
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--nest-yellow)' }}>
                  Spárovat
                </span>
              )}
            </button>
          ))}

          {/* Dismiss button — prominent so users don't miss it */}
          <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--nest-border)' }}>
            <button
              onClick={handleDismissClaim}
              className="w-full py-3 rounded-xl text-center font-semibold text-base transition-colors hover:bg-white/[0.08]"
              style={{ border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary, #fff)' }}
            >
              Nejsem nikdo z nich
            </button>
          </div>
        </div>
      )}

      {/* Claim success message */}
      {claimedName && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
          <Sparkles className="w-4 h-4 inline mr-2" />
          Účet spárován s {claimedName}
        </div>
      )}

      {/* Checklist — shows after registration */}
      {currentGuest && session && (
        <EventChecklist
          slug={slug}
          session={session}
          guest={currentGuest}
          seatReserved={seatReserved}
          hwReserved={hwReserved}
          gamesVoted={gamesVoted}
          roomSelected={!!currentGuest.room}
        />
      )}

      {/* REGISTRATION — Dominant CTA (hide if user already has claimed guest) */}
      {!claimedGuest && (
        <Link
          href={`/event/${slug}/register`}
          className="block mb-4 group"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--nest-yellow-dark)] to-[var(--nest-yellow)] p-5 nest-glow transition-all duration-300 group-hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--nest-dark)]/20 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-[var(--nest-dark)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--nest-dark)]">Registrace na akci</h2>
                  <p className="text-sm text-[var(--nest-dark)]/70">Zaregistruj se a vyber si svůj termín</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-[var(--nest-dark)]/60 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      )}

      {/* LOGIN CTA — for users who aren't authenticated yet */}
      {!isAuthenticated && (
        <Link
          href={`/auth/login?redirect=/event/${slug}`}
          className="block mb-6 group"
        >
          <div className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group-hover:scale-[1.01]" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <LogIn className="w-5 h-5 text-[var(--nest-yellow)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--nest-white)]">Přihlásit se</h3>
                  <p className="text-xs text-[var(--nest-white-40)]">Propoj svůj účet a uchovej historii</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--nest-white-40)] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      )}

      {/* Navigation Grid — compact cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {navItems.map((item) => {
          const isHighlightActive = (item as any).highlight && isLastDay
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group nest-card hover:border-[var(--nest-yellow)]/50 transition-all duration-200 p-4 flex flex-col items-center text-center gap-2.5 hover:bg-[var(--nest-yellow)]/10 hover:scale-[1.03] hover:shadow-lg hover:shadow-[var(--nest-yellow)]/5 ${isHighlightActive ? 'payment-glow' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isHighlightActive ? 'bg-pink-500/20' : 'bg-[var(--nest-dark-3)] group-hover:bg-[var(--nest-yellow)]/10'}`}>
                <item.icon className={`w-5 h-5 ${isHighlightActive ? 'text-pink-400' : 'text-[var(--nest-yellow)]'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${isHighlightActive ? 'text-pink-300' : 'text-[var(--nest-white)]'}`}>{item.label}</h3>
                <p className="text-xs text-[var(--nest-white-40)] mt-0.5">{item.desc}</p>
                {isHighlightActive && (
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-pink-400 bg-pink-500/15 px-2 py-0.5 rounded-full">Poslední den!</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </NestPage>
  )
}
