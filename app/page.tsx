'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { LogIn, Calendar, ChevronRight, User, LogOut } from 'lucide-react'
import { useGuestAuth } from '@/lib/auth-context'

export default function HomePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { userProfile, isAuthenticated, claimedGuests, loading: authLoading, logout } = useGuestAuth()

  const [sessionDetails, setSessionDetails] = useState<Record<string, { name: string; slug: string; start_date: string; end_date: string | null }>>({})

  // Fetch session details for claimed guests
  useEffect(() => {
    if (!isAuthenticated || claimedGuests.length === 0) return

    const fetchSessions = async () => {
      const details: Record<string, any> = {}
      await Promise.all(
        claimedGuests.map(async (guest) => {
          if (details[guest.session_id]) return
          try {
            const res = await fetch(`/api/sessions/${guest.session_id}`)
            if (res.ok) {
              const data = await res.json()
              details[guest.session_id] = {
                name: data.session?.name || 'Event',
                slug: data.session?.slug || '',
                start_date: data.session?.start_date || '',
                end_date: data.session?.end_date || null,
              }
            }
          } catch { }
        })
      )
      setSessionDetails(details)
    }

    fetchSessions()
  }, [isAuthenticated, claimedGuests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password.trim()) {
      setError('Zadej heslo eventu')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Neplatné heslo')
        setLoading(false)
        return
      }

      // Redirect to the event page
      router.push(`/event/${data.slug}`)
    } catch (err) {
      setError('Chyba připojení. Zkus to znovu.')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const siteUrl = 'https://nest-rust.vercel.app/'

  // Get unique sessions from claimed guests
  const userSessions = claimedGuests
    .filter(g => sessionDetails[g.session_id]?.slug)
    .reduce((acc, guest) => {
      if (!acc.find(s => s.sessionId === guest.session_id)) {
        const session = sessionDetails[guest.session_id]
        acc.push({
          sessionId: guest.session_id,
          guestName: guest.name,
          ...session,
        })
      }
      return acc
    }, [] as { sessionId: string; guestName: string; name: string; slug: string; start_date: string; end_date: string | null }[])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
      <div className="w-full max-w-md flex flex-col items-center gap-10">

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight"
            style={{ color: 'var(--nest-text-primary)' }}
          >
            The Nest
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--nest-text-tertiary)' }}>
            LAN Party Hub
          </p>
        </div>

        {/* Authenticated user — show their events */}
        {isAuthenticated && userProfile && (
          <div className="w-full space-y-4">
            {/* User badge */}
            <div
              className="w-full rounded-2xl p-4 flex items-center justify-between"
              style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                  {userProfile.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <User className="w-5 h-5" style={{ color: 'var(--nest-yellow)' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--nest-text-primary)' }}>
                    {userProfile.display_name}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--nest-text-tertiary)' }}>
                    {userProfile.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/auth/profile"
                  className="p-2 rounded-lg transition-colors hover:bg-white/5"
                  title="Profil"
                >
                  <User className="w-4 h-4" style={{ color: 'var(--nest-text-tertiary)' }} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg transition-colors hover:bg-white/5"
                  title="Odhlásit se"
                >
                  <LogOut className="w-4 h-4" style={{ color: 'var(--nest-text-tertiary)' }} />
                </button>
              </div>
            </div>

            {/* User's events — quick access */}
            {userSessions.length > 0 && (
              <div
                className="w-full rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>
                    Tvoje eventy
                  </h2>
                </div>
                {userSessions.map((session, idx) => (
                  <Link
                    key={session.sessionId}
                    href={`/event/${session.slug}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--nest-yellow)]/5"
                    style={idx < userSessions.length - 1 ? { borderBottom: '1px solid var(--nest-border)' } : {}}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                        <Calendar className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--nest-text-primary)' }}>
                          {session.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                          jako {session.guestName}
                          {session.start_date && ` · ${new Date(session.start_date).toLocaleDateString('cs-CZ')}`}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--nest-text-tertiary)' }} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Password Form */}
        <div
          className="w-full rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--nest-surface)',
            border: '1px solid var(--nest-border)',
          }}
        >
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--nest-text-primary)' }}>
            🔑 Přístup k eventu
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--nest-text-tertiary)' }}>
            Zadej heslo, které jsi dostal od organizátora
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Heslo eventu..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-base font-medium transition-all"
                style={{
                  backgroundColor: 'var(--nest-bg)',
                  border: `2px solid ${error ? 'var(--nest-error)' : 'var(--nest-border)'}`,
                  color: 'var(--nest-text-primary)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  if (!error) e.currentTarget.style.borderColor = 'var(--nest-yellow)'
                }}
                onBlur={(e) => {
                  if (!error) e.currentTarget.style.borderColor = 'var(--nest-border)'
                }}
              />
              {error && (
                <p className="mt-2 text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--nest-error)' }}>
                  <span>⚠️</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-base transition-all"
              style={{
                backgroundColor: loading ? 'var(--nest-border)' : 'var(--nest-yellow)',
                color: 'var(--nest-bg)',
                cursor: loading ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'var(--nest-yellow-light)'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'var(--nest-yellow)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="nest-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Ověřuji...
                </span>
              ) : (
                'Vstoupit →'
              )}
            </button>
          </form>
        </div>

        {/* Login CTA — only show if not authenticated */}
        {!authLoading && !isAuthenticated && (
          <Link
            href="/auth/login"
            className="w-full rounded-2xl p-4 flex items-center justify-between transition-colors hover:bg-white/[0.02]"
            style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <LogIn className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>
                  Přihlásit se
                </div>
                <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                  Propoj účet a uchovej historii
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--nest-text-tertiary)' }} />
          </Link>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="p-4 rounded-2xl"
            style={{
              backgroundColor: '#ffffff',
            }}
          >
            <QRCodeSVG
              value={siteUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#222831"
              level="M"
            />
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--nest-text-tertiary)' }}>
            Naskenuj QR kód pro rychlý přístup
          </p>
        </div>

      </div>
    </div>
  )
}
