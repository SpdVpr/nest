'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Calendar, Pizza, MonitorSmartphone, Users, AlertCircle,
  Armchair, UtensilsCrossed, Gamepad2, Wallet, UserPlus, ChevronRight, Trophy
} from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatEventRange } from '@/lib/utils'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'

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

      {/* REGISTRATION — Dominant CTA */}
      <Link
        href={`/event/${slug}/register`}
        className="block mb-6 group"
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