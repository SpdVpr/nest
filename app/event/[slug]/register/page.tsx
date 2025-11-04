'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Loader2, CheckCircle } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import DateRangeCalendar from '@/components/DateRangeCalendar'

export default function RegisterPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
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

      setSuccess(true)
      setName('')
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/event/${slug}/hardware`)
      }, 2000)
    } catch (error: any) {
      console.error('Error registering:', error)
      setError(error.message || 'Chyba při registraci')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🪺</div>
          <p className="text-gray-600">Načítám...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Event nenalezen</p>
          <Link href="/" className="text-purple-600 hover:text-purple-700">
            Zpět na homepage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <Link
          href={`/event/${slug}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Zpět na event
        </Link>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Registrace</h1>
          </div>

          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Akce:</p>
            <p className="font-bold text-gray-900">{session.name}</p>
            <p className="text-sm text-gray-600">
              {formatDate(session.start_date)}
              {session.end_date && ` - ${formatDate(session.end_date)}`}
            </p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Registrace úspěšná! 🎉
              </h2>
              <p className="text-gray-600 mb-4">
                Přesměrováváme tě na občerstvení...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Tvoje jméno
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Zadej své jméno"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Kdy přijedeš a odjedeš?
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
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                    {checkedInDate && checkedOutDate ? (
                      <p className="text-gray-800">
                        <span className="font-semibold">Počet nocí:</span> {calculateNights()} 
                      </p>
                    ) : (
                      <p className="text-gray-600">
                        {!checkedInDate ? 'Vyberte si příjezdový den' : 'Vyberte si odjezdový den'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !name.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registruji...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Zaregistrovat se
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            Už jsi zaregistrovaný?{' '}
            <Link href={`/event/${slug}/snacks`} className="text-purple-600 hover:text-purple-700 font-medium">
              Přejdi rovnou na občerstvení
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}