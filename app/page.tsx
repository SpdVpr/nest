'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Shield, ArrowRight, MapPin, Users } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const router = useRouter()

  useEffect(() => {
    console.log('[HomePage] Component mounted')
    setMounted(true)
    const token = localStorage.getItem('admin_token')
    console.log('[HomePage] Token from localStorage:', token ? 'EXISTS' : 'NULL')
    if (!token) {
      console.log('[HomePage] No token found, setting isAuthenticated to false')
      setIsAuthenticated(false)
      setLoading(false)
      return
    }
    console.log('[HomePage] Token found, setting isAuthenticated to true')
    setIsAuthenticated(true)
    fetchUpcomingEvents()
  }, [router])

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/events/upcoming')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventStatus = (session: Session): { status: string; label: string; daysUntil?: number } => {
    const now = new Date()
    const startDate = new Date(session.start_date)
    const endDate = session.end_date ? new Date(session.end_date) : startDate

    if (now >= startDate && now <= endDate) {
      return { status: 'active', label: 'Probíhá' }
    }

    if (now < startDate) {
      const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { status: 'upcoming', label: `Za ${daysUntil} ${daysUntil === 1 ? 'den' : daysUntil < 5 ? 'dny' : 'dní'}`, daysUntil }
    }

    return { status: 'completed', label: 'Ukončeno' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'upcoming': return 'bg-blue-500'
      case 'completed': return 'bg-gray-400'
      default: return 'bg-gray-300'
    }
  }

  if (!mounted) {
    console.log('[HomePage] Rendering: Not mounted yet')
    return null
  }

  if (loading) {
    console.log('[HomePage] Rendering: Loading state')
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🪺</div>
          <p className="text-gray-600">Načítám eventy...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('[HomePage] Rendering: Not authenticated - showing admin-only message')
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Shield className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🪺 The Nest
          </h1>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            Přístup pouze pro administrátory
          </h2>
          <p className="text-gray-600 mb-6">
            Tato stránka je určena pouze pro správu eventů. Pokud jsi účastník, admin ti pošle přímý odkaz na tvůj event.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <Shield className="w-5 h-5" />
            Admin přihlášení
          </Link>
        </div>
      </div>
    )
  }

  console.log('[HomePage] Rendering: Authenticated - showing events list')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-bold text-gray-900 mb-6">
            🪺 The Nest
          </h1>

          <p className="text-lg text-gray-600">
            Vyber akci a začni rezervovat
          </p>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Dostupné akce</h2>
            </div>
            <Link
              href="/admin/login"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span className="hidden sm:inline">Administrace</span>
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 text-lg mb-6">
                Zatím nejsou naplánované žádné akce
              </p>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <Shield className="w-5 h-5" />
                Přejít do administrace
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const eventStatus = getEventStatus(session)
                return (
                  <Link
                    key={session.id}
                    href={`/event/${session.slug}`}
                    className="block group"
                  >
                    <div className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${eventStatus.status === 'active'
                      ? 'border-green-400 bg-green-50 hover:border-green-500'
                      : 'border-gray-200 hover:border-purple-400 bg-white'
                      }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {session.name}
                            </h3>
                            <span className={`${getStatusColor(eventStatus.status)} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                              {eventStatus.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-4 text-gray-600 mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {formatEventRange(session.start_date, session.end_date, session.start_time, session.end_time)}
                              </span>
                            </div>
                          </div>

                          {session.description && (
                            <p className="text-gray-600 mt-2 whitespace-pre-line">
                              {session.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-purple-600 group-hover:text-purple-700 font-semibold">
                          <span className="hidden sm:inline">Přejít na event</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <Shield className="w-5 h-5" />
            Administrace
          </Link>
        </div>
      </div>
    </div>
  )
}
