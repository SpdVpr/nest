'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Shield, ArrowRight, Trophy, Beer, Zap, Candy, Users } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'
import NestLoading from '@/components/NestLoading'

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('admin_token')
    if (!token) {
      setIsAuthenticated(false)
      setLoading(false)
      return
    }
    setIsAuthenticated(true)
    fetchUpcomingEvents()
    fetchRecords()
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

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/records')
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error fetching records:', error)
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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[var(--nest-success)]/20 text-[var(--nest-success)] border-[var(--nest-success)]/30'
      case 'upcoming': return 'bg-[var(--nest-yellow)]/15 text-[var(--nest-yellow)] border-[var(--nest-yellow)]/30'
      case 'completed': return 'bg-[var(--nest-white-40)]/15 text-[var(--nest-white-40)] border-[var(--nest-white-40)]/30'
      default: return 'bg-[var(--nest-white-40)]/15 text-[var(--nest-white-40)]'
    }
  }

  if (!mounted) return null

  if (loading) {
    return <NestLoading message="Načítám eventy..." />
  }

  // Not authenticated — show only branding
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--nest-dark)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-[var(--nest-white)] tracking-tight">
            The Nest
          </h1>
        </div>
      </div>
    )
  }

  // Authenticated — events list
  return (
    <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)]">
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">
          The Nest
        </h1>
        <p className="text-sm text-[var(--nest-white-60)]">
          Vyber akci a začni rezervovat
        </p>
      </div>

      {/* Events container */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="nest-card-elevated p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--nest-yellow)]" />
              <h2 className="text-lg font-bold">Dostupné akce</h2>
            </div>
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 text-[var(--nest-white-40)] hover:text-[var(--nest-yellow)] transition-colors text-xs font-medium"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Administrace</span>
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-[var(--nest-white-60)] text-sm mb-5">
                Zatím nejsou naplánované žádné akce
              </p>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-2 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-dark)] px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                <Shield className="w-4 h-4" />
                Přejít do administrace
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const eventStatus = getEventStatus(session)
                return (
                  <Link
                    key={session.id}
                    href={`/event/${session.slug}`}
                    className="block group"
                  >
                    <div className={`p-4 rounded-xl border transition-all duration-200 hover:border-[var(--nest-yellow)]/40 ${eventStatus.status === 'active'
                      ? 'border-[var(--nest-success)]/30 bg-[var(--nest-success)]/5'
                      : 'border-[var(--nest-dark-4)] bg-[var(--nest-dark-3)] hover:bg-[var(--nest-dark-3)]'
                      }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-base font-bold truncate">
                              {session.name}
                            </h3>
                            <span className={`${getStatusStyles(eventStatus.status)} px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap`}>
                              {eventStatus.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[var(--nest-white-60)] text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {formatEventRange(session.start_date, session.end_date, session.start_time, session.end_time)}
                            </span>
                          </div>

                          {session.description && (
                            <p className="text-[var(--nest-white-40)] mt-1.5 text-xs line-clamp-2 whitespace-pre-line">
                              {session.description}
                            </p>
                          )}
                        </div>

                        <ArrowRight className="w-4 h-4 text-[var(--nest-white-40)] group-hover:text-[var(--nest-yellow)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Nest Records Section */}
        {records.length > 0 && (() => {
          const RECORD_CATEGORIES = [
            { value: 'attendance', label: 'Účast', emoji: '👥', color: '#3b82f6' },
            { value: 'pivo', label: 'Pivo', emoji: '🍺', color: '#f59e0b' },
            { value: 'redbull', label: 'Red Bull', emoji: '⚡', color: '#ef4444' },
            { value: 'bueno', label: 'Kinder Bueno', emoji: '🍫', color: '#a855f7' },
            { value: 'jagermeister', label: 'Jägermeister', emoji: '🦌', color: '#22c55e' },
          ]

          // Group and find the top record per category
          const grouped: Record<string, any[]> = {}
          records.forEach(r => {
            if (!grouped[r.category]) grouped[r.category] = []
            grouped[r.category].push(r)
          })
          Object.values(grouped).forEach(arr => arr.sort((a: any, b: any) => b.count - a.count))

          return (
            <div className="nest-card-elevated p-6 mt-6">
              <div className="flex items-center gap-2 mb-5">
                <Trophy className="w-5 h-5 text-[var(--nest-yellow)]" />
                <h2 className="text-lg font-bold">Rekordy Nestu</h2>
              </div>

              <div className="space-y-3">
                {RECORD_CATEGORIES.map(cat => {
                  const catRecords = grouped[cat.value] || []
                  if (catRecords.length === 0) return null

                  const top = catRecords[0]

                  return (
                    <div
                      key={cat.value}
                      className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                      style={{
                        backgroundColor: `${cat.color}08`,
                        border: `1px solid ${cat.color}20`,
                      }}
                    >
                      <span className="text-2xl flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: `${cat.color}cc` }}>{cat.label}</p>
                        <p className="text-sm font-bold text-[var(--nest-white)] truncate">
                          {top.group_name}
                        </p>
                        {top.date && (
                          <p className="text-xs text-[var(--nest-white-40)]">
                            {new Date(top.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div
                        className="text-lg font-bold px-3 py-1 rounded-lg flex-shrink-0"
                        style={{ color: cat.color, backgroundColor: `${cat.color}15` }}
                      >
                        {top.count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
