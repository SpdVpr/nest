'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Users, Loader2, Info } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'
import DateRangeCalendar from '@/components/DateRangeCalendar'
import { guestStorage } from '@/lib/guest-storage'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'

const MIN_GUESTS_FOR_BASE_PRICE = 10
const SURCHARGE_PER_MISSING_GUEST = 150

export default function RegisterPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guestCount, setGuestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [checkedInDate, setCheckedInDate] = useState<Date | undefined>()
  const [checkedOutDate, setCheckedOutDate] = useState<Date | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) {
      fetchEvent()
    }
  }, [slug])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/event/${slug}`)

      if (!response.ok) {
        throw new Error('Failed to fetch event')
      }

      const data = await response.json()
      setSession(data.session)
      setGuestCount(data.guest_count || 0)
    } catch (error) {
      console.error('Error fetching event:', error)
      setError('Chyba při načítání eventu')
    } finally {
      setLoading(false)
    }
  }

  const calculateNights = (): number => {
    if (!checkedInDate || !checkedOutDate) return 0
    const checkIn = new Date(checkedInDate.getFullYear(), checkedInDate.getMonth(), checkedInDate.getDate())
    const checkOut = new Date(checkedOutDate.getFullYear(), checkedOutDate.getMonth(), checkedOutDate.getDate())
    const diffTime = checkOut.getTime() - checkIn.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Calculate the effective price per night.
   * Base price (set in admin) applies at ≥10 guests.
   * For each missing guest below 10, price increases by 150 Kč.
   * We count the new registrant as +1 (optimistic).
   */
  const calculateEffectivePrice = (): { basePrice: number; effectivePrice: number; surcharge: number; effectiveGuestCount: number } => {
    const basePrice = (session as any)?.price_per_night || 0
    const isSurchargeEnabled = (session as any)?.surcharge_enabled === true
    // Count the current registrant as +1
    const effectiveGuestCount = guestCount + 1
    if (!isSurchargeEnabled || effectiveGuestCount >= MIN_GUESTS_FOR_BASE_PRICE) {
      return { basePrice, effectivePrice: basePrice, surcharge: 0, effectiveGuestCount }
    }
    const missingGuests = MIN_GUESTS_FOR_BASE_PRICE - effectiveGuestCount
    const surcharge = missingGuests * SURCHARGE_PER_MISSING_GUEST
    return { basePrice, effectivePrice: basePrice + surcharge, surcharge, effectiveGuestCount }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Zadej své jméno')
      return
    }

    if (!checkedInDate || !checkedOutDate) {
      setError('Vyber si příjezdový a odjezdový den')
      return
    }

    const nightsNum = calculateNights()
    if (nightsNum < 1) {
      setError('Počet nocí musí být alespoň 1')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/event/${slug}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nights_count: nightsNum,
          check_in_date: checkedInDate,
          check_out_date: checkedOutDate
        }),
      })

      if (!response.ok) {
        console.error('Response status:', response.status)
        let errorMessage = 'Chyba při registraci'
        try {
          const text = await response.text()
          console.error('Response text:', text)
          const data = JSON.parse(text)
          errorMessage = data.error || errorMessage
        } catch (e) {
          console.error('Failed to parse error response:', e)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const guest = data.guest

      guestStorage.setCurrentGuest({
        id: guest.id,
        name: guest.name,
        session_slug: slug
      })

      router.replace(`/event/${slug}/hardware`)
    } catch (error: any) {
      console.error('Error registering:', error)
      setError(error.message || 'Chyba při registraci')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <NestLoading message="Načítám..." />
  }

  if (!session) {
    return (
      <NestPage title="Chyba">
        <div className="text-center py-20">
          <p className="text-[var(--nest-white-60)] mb-4">Event nenalezen</p>
          <Link href="/" className="text-[var(--nest-yellow)] hover:underline text-sm">
            Zpět na homepage
          </Link>
        </div>
      </NestPage>
    )
  }

  const { basePrice, effectivePrice, surcharge, effectiveGuestCount } = calculateEffectivePrice()
  const nights = calculateNights()

  return (
    <NestPage
      sessionSlug={slug}
      backHref={`/event/${slug}`}
      title="Registrace"
      maxWidth="max-w-md"
    >
      {/* Registration Card */}
      <div className="nest-card-elevated p-6 mt-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[var(--nest-yellow)]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--nest-yellow)]" />
          </div>
          <h1 className="text-xl font-bold">Registrace</h1>
        </div>

        {/* Event info */}
        <div className="mb-5 p-3 bg-[var(--nest-dark-3)] rounded-xl border border-[var(--nest-dark-4)]">
          <p className="text-xs text-[var(--nest-white-40)] mb-0.5">Akce:</p>
          <p className="font-bold text-sm">{session.name}</p>
          <p className="text-xs text-[var(--nest-white-60)]">
            {formatEventRange(session.start_date, session.end_date, session.start_time, session.end_time)}
          </p>
        </div>

        {/* Price per night info */}
        {basePrice > 0 && (
          <div className="mb-5 p-3 rounded-xl border" style={{
            backgroundColor: surcharge > 0 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(34, 197, 94, 0.08)',
            borderColor: surcharge > 0 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(34, 197, 94, 0.25)',
          }}>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{
                color: surcharge > 0 ? '#fbbf24' : '#22c55e'
              }} />
              <div className="flex-1">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs font-medium" style={{
                    color: surcharge > 0 ? '#fbbf24' : '#22c55e'
                  }}>
                    Cena za noc
                  </p>
                  <p className="text-lg font-bold" style={{
                    color: surcharge > 0 ? '#fbbf24' : '#22c55e'
                  }}>
                    {effectivePrice} Kč
                  </p>
                </div>

                {surcharge > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-[var(--nest-white-60)]">
                      Základní cena: <span className="font-medium text-[var(--nest-white-80)]">{basePrice} Kč</span> (platí od {MIN_GUESTS_FOR_BASE_PRICE} lidí)
                    </p>
                    <p className="text-xs text-[var(--nest-white-60)]">
                      Aktuálně zaregistrováno: <span className="font-medium text-[var(--nest-white-80)]">{effectiveGuestCount} / {MIN_GUESTS_FOR_BASE_PRICE}</span>
                    </p>
                    <p className="text-xs" style={{ color: '#fbbf24' }}>
                      Příplatek +{surcharge} Kč ({MIN_GUESTS_FOR_BASE_PRICE - effectiveGuestCount}× {SURCHARGE_PER_MISSING_GUEST} Kč za chybějící účastníky)
                    </p>
                    <p className="text-[10px] text-[var(--nest-white-40)] mt-1">
                      💡 Čím více lidí se přihlásí, tím nižší bude cena za noc
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--nest-white-60)]">
                    Registrováno {effectiveGuestCount} lidí — základní cena platí ✓
                  </p>
                )}

                {nights > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{
                    borderColor: surcharge > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(34, 197, 94, 0.2)'
                  }}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs text-[var(--nest-white-60)]">
                        {nights} {nights === 1 ? 'noc' : nights < 5 ? 'noci' : 'nocí'} × {effectivePrice} Kč
                      </p>
                      <p className="text-sm font-bold" style={{
                        color: surcharge > 0 ? '#fbbf24' : '#22c55e'
                      }}>
                        = {nights * effectivePrice} Kč
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="name" className="block text-xs font-medium text-[var(--nest-white-60)] mb-1.5">
              Tvoje jméno <span className="text-[var(--nest-error)]">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Zadej své jméno"
              className="w-full px-4 py-2.5 bg-[var(--nest-dark-3)] border border-[var(--nest-dark-4)] rounded-xl focus:ring-2 focus:ring-[var(--nest-yellow)]/50 focus:border-[var(--nest-yellow)]/50 text-[var(--nest-white)] placeholder-[var(--nest-white-40)] text-sm outline-none transition-all"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--nest-white-60)] mb-2">
              Kdy přijedeš a odjedeš? <span className="text-[var(--nest-error)]">*</span>
            </label>
            <DateRangeCalendar
              startDate={new Date(session.start_date)}
              endDate={session.end_date ? new Date(session.end_date) : undefined}
              onCheckIn={setCheckedInDate}
              onCheckOut={setCheckedOutDate}
              checkedInDate={checkedInDate}
              checkedOutDate={checkedOutDate}
              onReset={() => {
                setCheckedInDate(undefined)
                setCheckedOutDate(undefined)
              }}
            />
            {(checkedInDate || checkedOutDate) && (
              <div className="mt-2 p-2.5 bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20 rounded-lg text-xs">
                {checkedInDate && checkedOutDate ? (
                  <p className="text-[var(--nest-yellow)]">
                    <span className="font-semibold">Počet nocí:</span> {calculateNights()}
                  </p>
                ) : (
                  <p className="text-[var(--nest-white-60)]">
                    {!checkedInDate ? 'Vyberte si příjezdový den' : 'Vyberte si odjezdový den'}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[var(--nest-error)]/10 border border-[var(--nest-error)]/20 rounded-xl text-[var(--nest-error)] text-xs">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !checkedInDate || !checkedOutDate}
            className="w-full bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] disabled:bg-[var(--nest-dark-4)] disabled:text-[var(--nest-white-40)] disabled:cursor-not-allowed text-[var(--nest-dark)] py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registruji...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Zaregistrovat se
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-[var(--nest-dark-4)] text-center text-xs text-[var(--nest-white-40)]">
          Už jsi zaregistrovaný?{' '}
          <Link href={`/event/${slug}/snacks`} className="text-[var(--nest-yellow)] hover:underline font-medium">
            Přejdi rovnou na občerstvení
          </Link>
        </div>
      </div>
    </NestPage>
  )
}