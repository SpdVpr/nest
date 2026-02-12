'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Pizza, MonitorSmartphone, Users, AlertCircle, Armchair, UtensilsCrossed, Gamepad2 } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'
import EventGuestHeader from '@/components/EventGuestHeader'

export default function EventPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guestCount, setGuestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json()
        setGuestCount(guestsData.guests?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Chyba při načítání eventu')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🪺</div>
          <p className="text-gray-600">Načítám event...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event nenalezen</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Zpět na seznam eventů
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'upcoming': return 'bg-blue-500'
      case 'completed': return 'bg-gray-400'
      default: return 'bg-gray-300'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Probíhá'
      case 'upcoming': return 'Nadcházející'
      case 'completed': return 'Ukončeno'
      case 'draft': return 'Koncept'
      default: return status || 'Neznámý'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12 px-4">
      <EventGuestHeader session_slug={slug} />
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}


        {/* Event Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            🪺 {session.name}
          </h1>
          <div className="inline-flex flex-col items-center gap-3 bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-600" />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {formatEventRange(session.start_date, session.end_date, session.start_time, session.end_time)}
                </p>
              </div>
            </div>
          </div>

          {session.description && (
            <p className="mt-4 text-lg text-gray-700 max-w-lg mx-auto whitespace-pre-line">
              {session.description}
            </p>
          )}
        </div>

        {/* Action Cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            href={`/event/${slug}/guests`}
            className="group bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center space-y-4 hover:scale-105"
          >
            <Users className="w-16 h-16" />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Registrovaní lidé</h2>
              <p className="text-blue-100 text-sm">
                {guestCount} {guestCount === 1 ? 'uživatel' : guestCount >= 2 && guestCount <= 4 ? 'uživatelé' : 'uživatelů'}
              </p>
            </div>
          </Link>

          <Link
            href={`/event/${slug}/snacks`}
            className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center space-y-4 hover:scale-105"
          >
            <Pizza className="w-16 h-16" />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Občerstvení</h2>
              <p className="text-green-100 text-sm">Přidej si, co jsi snědl a vypil</p>
            </div>
          </Link>

          <Link
            href={`/event/${slug}/hardware`}
            className="group bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center space-y-4 hover:scale-105"
          >
            <MonitorSmartphone className="w-16 h-16" />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Rezervace HW</h2>
              <p className="text-orange-100 text-sm">Zapůjč si monitor nebo PC</p>
            </div>
          </Link>

          <Link
            href={`/event/${slug}/seats`}
            className="group bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center space-y-4 hover:scale-105"
          >
            <Armchair className="w-16 h-16" />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Rezervace Míst</h2>
              <p className="text-indigo-100 text-sm">Vyber si své místo k sezení</p>
            </div>
          </Link>

          {session.menu_enabled && (
            <Link
              href={`/event/${slug}/menu`}
              className="group bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center space-y-4 hover:scale-105"
            >
              <UtensilsCrossed className="w-16 h-16" />
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">Jídelníček</h2>
                <p className="text-amber-100 text-sm">Podívej se co je k jídlu</p>
              </div>
            </Link>
          )}

          <Link
            href={`/event/${slug}/games`}
            className="group bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center space-y-4 hover:scale-105"
          >
            <Gamepad2 className="w-16 h-16" />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Hry</h2>
              <p className="text-violet-100 text-sm">Hlasuj co budeme hrát na LAN</p>
            </div>
          </Link>

          <Link
            href={`/event/${slug}/register`}
            className="group sm:col-span-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 flex items-center justify-center space-x-4 hover:scale-105"
          >
            <Users className="w-12 h-12" />
            <div className="text-left">
              <h2 className="text-xl font-bold mb-1">Registrace</h2>
              <p className="text-purple-100 text-sm">Zaregistruj se na akci</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}