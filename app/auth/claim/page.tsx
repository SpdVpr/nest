'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Calendar, ChevronRight, UserCheck, Sparkles, Loader2 } from 'lucide-react'
import { useGuestAuth } from '@/lib/auth-context'
import { guestStorage } from '@/lib/guest-storage'

interface UnclaimedGuest {
  id: string
  name: string
  nights_count: number
  check_in_date?: string | null
  check_out_date?: string | null
}

interface SessionWithGuests {
  session: {
    id: string
    name: string
    slug: string
    start_date: string
    end_date: string | null
  }
  guests: UnclaimedGuest[]
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  )
}

function ClaimPageContent() {
  const [sessions, setSessions] = useState<SessionWithGuests[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [claimedNames, setClaimedNames] = useState<string[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { firebaseUser, isAuthenticated, loading: authLoading, refreshProfile } = useGuestAuth()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) {
      router.push('/auth/login')
      return
    }
    fetchUnclaimedGuests()
  }, [firebaseUser, authLoading])

  const fetchUnclaimedGuests = async () => {
    try {
      const token = await firebaseUser!.getIdToken()
      const res = await fetch('/api/auth/unclaimed-guests', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (err) {
      console.error('Failed to fetch unclaimed guests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (guest: UnclaimedGuest, sessionSlug: string) => {
    setClaiming(guest.id)
    setError('')

    try {
      const token = await firebaseUser!.getIdToken()
      const res = await fetch('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ guest_id: guest.id }),
      })

      if (res.ok) {
        setClaimedNames(prev => [...prev, guest.name])

        // Also set localStorage for backward compatibility
        guestStorage.setCurrentGuest({
          id: guest.id,
          name: guest.name,
          session_slug: sessionSlug,
        })

        // Refresh the auth context
        await refreshProfile()

        // Remove the claimed guest from the list
        setSessions(prev =>
          prev.map(s => ({
            ...s,
            guests: s.guests.filter(g => g.id !== guest.id),
          })).filter(s => s.guests.length > 0)
        )

        // Scroll to bottom to show success + continue button
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else if (res.status === 409) {
        setError('Tento účastník už byl spárován s jiným uživatelem.')
        await fetchUnclaimedGuests()
      } else {
        setError('Párování selhalo. Zkus to znovu.')
      }
    } catch (err) {
      setError('Chyba při párování.')
    } finally {
      setClaiming(null)
    }
  }

  const handleSkip = () => {
    router.push(redirect)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full mb-4" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <UserCheck className="w-12 h-12" style={{ color: 'var(--nest-yellow, #f59e0b)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nest-text-primary, #fff)' }}>
            Spáruj svůj účet
          </h1>
          <p className="text-sm" style={{ color: 'var(--nest-text-secondary, #888)' }}>
            Pokud jsi už byl/a na nějaké akci, najdi své jméno a spáruj ho se svým účtem.
            Všechna data (spotřeba, platby, HW) se přenesou. Párování stačí provést jednou — na dalších akcích se budeš přihlašovat rovnou.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Sessions with unclaimed guests — 2-column grid */}
        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {sessions.map(({ session, guests }) => (
              <div
                key={session.id}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--nest-surface, #1a1d27)', border: '1px solid var(--nest-border, #2a2d37)' }}
              >
                {/* Session header */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--nest-text-primary)' }}>
                    {session.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <span className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                      {new Date(session.start_date).toLocaleDateString('cs-CZ')}
                      {session.end_date && ` – ${new Date(session.end_date).toLocaleDateString('cs-CZ')}`}
                    </span>
                  </div>
                </div>

                {/* Guest list */}
                <div>
                  {guests.map((guest, idx) => (
                    <button
                      key={guest.id}
                      onClick={() => handleClaim(guest, session.slug)}
                      disabled={claiming !== null}
                      className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--nest-yellow)]/5 disabled:opacity-50"
                      style={idx < guests.length - 1 ? { borderBottom: '1px solid var(--nest-border)' } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--nest-dark-3, #2a2d37)' }}>
                          <Users className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="text-sm font-medium block truncate" style={{ color: 'var(--nest-text-primary)' }}>
                            {guest.name}
                          </span>
                          <span className="block text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                            {guest.nights_count} {guest.nights_count === 1 ? 'noc' : guest.nights_count < 5 ? 'noci' : 'nocí'}
                          </span>
                        </div>
                      </div>
                      {claiming === guest.id ? (
                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--nest-yellow)' }} />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--nest-text-tertiary)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-8 rounded-2xl" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--nest-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
              {claimedNames.length > 0 ? 'Všechna jména byla spárována!' : 'Žádná nespárovaná jména nebyla nalezena.'}
            </p>
          </div>
        )}

        {/* Bottom section — success + continue (scroll target) */}
        <div ref={bottomRef}>
          {/* Success message — shown right above the button */}
          {claimedNames.length > 0 && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
              <Sparkles className="w-4 h-4 inline mr-2" />
              Spárováno: {claimedNames.join(', ')}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pb-8">
            <button
              onClick={handleSkip}
              className="w-full font-semibold py-3 px-6 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--nest-yellow)', color: 'var(--nest-bg)' }}
            >
              {claimedNames.length > 0 ? 'Pokračovat' : 'Přeskočit a začít od znova'}
            </button>

            {claimedNames.length === 0 && sessions.length > 0 && (
              <p className="text-center text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                Párování stačí provést jednou — na dalších akcích se budeš hlásit rovnou
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
