'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Users, Loader2 } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'
import DateRangeCalendar from '@/components/DateRangeCalendar'
import { guestStorage } from '@/lib/guest-storage'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'

export default function RegisterPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
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