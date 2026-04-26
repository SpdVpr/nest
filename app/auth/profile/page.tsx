'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Mail, Calendar, Pizza, MonitorSmartphone, LogOut, ArrowLeft,
  Loader2, UserCheck, ChevronRight, ChevronDown, Wallet, Gamepad2,
  Armchair, CreditCard, CircleDollarSign, CheckCircle2, Clock,
  Beer, Moon, Trophy, Award, Zap, Star, Download, Lock, Pencil, Check, X, Unlink
} from 'lucide-react'
import { useGuestAuth } from '@/lib/auth-context'
import { guestStorage } from '@/lib/guest-storage'
import { ACHIEVEMENTS, AchievementTier, computeUserStats, GROUP_LABELS, TIER_RANK } from '@/lib/achievements'

interface ConsumptionItem {
  name: string
  category: string
  qty: number
  unitPrice: number
  totalPrice: number
}

interface HardwareItem {
  name: string
  type: string
  qty: number
  totalPrice: number
}

interface EventHistory {
  session: {
    id: string
    name: string
    slug: string
    start_date: string
    end_date: string | null
    status?: string
  }
  guest: {
    id: string
    name: string
    nights_count: number
    check_in_date?: string | null
    check_out_date?: string | null
    deposit: number
  }
  consumption: ConsumptionItem[]
  snacksTotal: number
  hardware: HardwareItem[]
  hwTotal: number
  seats: string[]
  tip: number
  gameVoteCount: number
  nightsTotal: number
  grandTotal: number
  settlement: {
    status: string
    paid_at: string | null
  } | null
  registrationOrder?: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { firebaseUser, userProfile, claimedGuests, isAuthenticated, loading: authLoading, logout, refreshProfile } = useGuestAuth()
  const [events, setEvents] = useState<EventHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null)
  const [confirmUnclaimId, setConfirmUnclaimId] = useState<string | null>(null)
  const [rarity, setRarity] = useState<{ totalIdentities: number; rarity: Record<string, number> } | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    fetchHistory()
    fetchRarity()
  }, [isAuthenticated, authLoading])

  const fetchRarity = async () => {
    try {
      const res = await fetch('/api/achievements/rarity')
      if (res.ok) setRarity(await res.json())
    } catch { }
  }

  const fetchHistory = async () => {
    if (!firebaseUser) {
      setLoadingHistory(false)
      return
    }

    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch('/api/auth/history', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
        // Auto-expand first event
        if (data.events?.length > 0) {
          setExpandedEvents(new Set([data.events[0].session.id]))
        }
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const toggleEvent = (sessionId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleSaveName = async () => {
    if (!editName.trim() || !firebaseUser) return
    setSavingName(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ display_name: editName.trim() }),
      })
      if (res.ok) {
        await refreshProfile()
        setEditingName(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Chyba při ukládání')
      }
    } catch {
      alert('Chyba při ukládání')
    } finally {
      setSavingName(false)
    }
  }

  const handleUnclaim = async (guestId: string) => {
    if (!firebaseUser) return
    setUnclaimingId(guestId)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch('/api/auth/unclaim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ guest_id: guestId }),
      })
      if (res.ok) {
        // Clear localStorage if this guest was stored as current
        guestStorage.clearIfMatches(guestId)
        await refreshProfile()
        await fetchHistory()
        setConfirmUnclaimId(null)
      } else {
        alert('Odpárování selhalo.')
      }
    } catch {
      alert('Chyba při odpárování.')
    } finally {
      setUnclaimingId(null)
    }
  }

  const formatCurrency = (amount: number) => `${amount.toLocaleString('cs-CZ')} Kč`

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
      </div>
    )
  }

  if (!isAuthenticated || !userProfile) {
    return null
  }

  const providerLabel = {
    email: 'Email',
    google: 'Google',
    apple: 'Apple',
  }[userProfile.auth_provider] || userProfile.auth_provider

  // Aggregate stats
  const totalNights = events.reduce((sum, e) => sum + e.guest.nights_count, 0)
  const totalSpent = events.reduce((sum, e) => sum + e.grandTotal, 0)
  const totalSnacks = events.reduce((sum, e) => sum + e.snacksTotal, 0)
  const totalConsumptionItems = events.reduce((sum, e) => sum + e.consumption.reduce((s, c) => s + c.qty, 0), 0)

  // Personal records
  const beersByEvent = events.map(e =>
    e.consumption.filter(c => c.category?.toLowerCase().includes('pivo')).reduce((s, c) => s + c.qty, 0)
  )
  const maxBeersIdx = beersByEvent.indexOf(Math.max(0, ...beersByEvent))
  const totalBeers = beersByEvent.reduce((s, b) => s + b, 0)

  const personalRecords = events.length > 0 ? {
    maxBeers: Math.max(0, ...beersByEvent),
    maxBeersEvent: events[maxBeersIdx]?.session.name || '',
    maxSpending: Math.max(0, ...events.map(e => e.grandTotal)),
    maxSpendingEvent: events.reduce((max, e) => e.grandTotal > max.grandTotal ? e : max, events[0])?.session.name || '',
    longestStay: Math.max(0, ...events.map(e => e.guest.nights_count)),
    longestStayEvent: events.reduce((max, e) => e.guest.nights_count > max.guest.nights_count ? e : max, events[0])?.session.name || '',
  } : null

  // Achievements: shared spec from lib/achievements.ts so server and client agree
  const userStats = computeUserStats(events.map(e => ({
    nights_count: e.guest.nights_count,
    grandTotal: e.grandTotal,
    tip: e.tip,
    consumption: e.consumption.map(c => ({ name: c.name, category: c.category, qty: c.qty })),
    registrationOrder: e.registrationOrder,
    gameVoteCount: e.gameVoteCount,
  })))

  const evaluatedAchievements = ACHIEVEMENTS.map(a => ({ spec: a, progress: a.evaluate(userStats) }))
    .sort((a, b) => {
      // Earned first (in tier desc), then in-progress by completion %, then locked
      if (a.progress.earned !== b.progress.earned) return a.progress.earned ? -1 : 1
      if (a.progress.earned) return TIER_RANK[b.spec.tier] - TIER_RANK[a.spec.tier]
      const pa = a.progress.target > 0 ? a.progress.current / a.progress.target : 0
      const pb = b.progress.target > 0 ? b.progress.current / b.progress.target : 0
      return pb - pa
    })

  const earnedCount = evaluatedAchievements.filter(a => a.progress.earned).length

  // CSV export
  const exportCSV = () => {
    const headers = ['Event', 'Datum', 'Noci', 'Ubytování (Kč)', 'Občerstvení (Kč)', 'Hardware (Kč)', 'Spropitné (Kč)', 'Celkem (Kč)', 'Stav']
    const rows = events.map(e => [
      e.session.name,
      new Date(e.session.start_date).toLocaleDateString('cs-CZ'),
      e.guest.nights_count,
      e.nightsTotal,
      e.snacksTotal,
      e.hwTotal,
      e.tip,
      e.grandTotal,
      e.settlement?.status === 'paid' ? 'Zaplaceno' : 'Nezaplaceno'
    ])
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nest-historie-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--nest-bg, #0f1117)' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-6 text-sm font-medium hover:underline"
          style={{ color: 'var(--nest-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět
        </button>

        {/* Profile header — wide layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* User card */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--nest-surface, #1a1d27)', border: '1px solid var(--nest-border, #2a2d37)' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                {userProfile.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <User className="w-8 h-8" style={{ color: 'var(--nest-yellow)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[var(--nest-bg)] border border-[var(--nest-yellow)]/50 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--nest-yellow)]/30"
                      style={{ color: 'var(--nest-text-primary)' }}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    />
                    <button onClick={handleSaveName} disabled={savingName || !editName.trim()} className="p-1.5 rounded-lg hover:bg-green-500/10 transition-colors disabled:opacity-40">
                      {savingName ? <Loader2 className="w-4 h-4 animate-spin text-green-400" /> : <Check className="w-4 h-4 text-green-400" />}
                    </button>
                    <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                      <X className="w-4 h-4" style={{ color: 'var(--nest-text-tertiary)' }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold truncate" style={{ color: 'var(--nest-text-primary)' }}>
                      {userProfile.display_name}
                    </h1>
                    <button
                      onClick={() => { setEditName(userProfile.display_name); setEditingName(true) }}
                      className="p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                      title="Změnit jméno"
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--nest-text-tertiary)' }} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--nest-text-tertiary)' }} />
                  <span className="text-sm truncate" style={{ color: 'var(--nest-text-secondary)' }}>
                    {userProfile.email}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--nest-yellow)' }}>
                    {providerLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                style={{ border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Odhlásit se
              </button>
            </div>

            {/* Paired names */}
            {claimedGuests.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--nest-border)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--nest-text-secondary)' }}>Spárovaná jména</span>
                </div>
                <div className="space-y-2">
                  {claimedGuests.map((guest) => {
                    const eventName = events.find(e => e.session.id === guest.session_id)?.session.name
                    const isConfirming = confirmUnclaimId === guest.id
                    return (
                      <div
                        key={guest.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)' }}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--nest-text-primary)' }}>
                            {guest.name}
                          </div>
                          {eventName && (
                            <div className="text-xs truncate" style={{ color: 'var(--nest-text-tertiary)' }}>
                              {eventName}
                            </div>
                          )}
                        </div>
                        {isConfirming ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleUnclaim(guest.id)}
                              disabled={unclaimingId === guest.id}
                              className="px-2 py-1 rounded text-xs font-medium transition-colors"
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                            >
                              {unclaimingId === guest.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Potvrdit'
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmUnclaimId(null)}
                              className="p-1 rounded hover:bg-white/5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" style={{ color: 'var(--nest-text-tertiary)' }} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmUnclaimId(guest.id)}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                            title="Odpárovat"
                          >
                            <Unlink className="w-3.5 h-3.5" style={{ color: 'var(--nest-text-tertiary)' }} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
              <Calendar className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
              <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{events.length}</div>
              <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                {events.length === 1 ? 'Event' : 'Eventů'}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
              <Clock className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
              <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{totalNights}</div>
              <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                {totalNights === 1 ? 'Noc' : totalNights < 5 ? 'Noci' : 'Nocí'}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
              <Pizza className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
              <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{totalConsumptionItems}</div>
              <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Položek spotřeby</div>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
              <CircleDollarSign className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
              <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{formatCurrency(totalSpent)}</div>
              <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Celkem utraceno</div>
            </div>
          </div>
        </div>

        {/* Personal Records */}
        {personalRecords && events.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--nest-text-primary)' }}>
              Osobní rekordy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <Beer className="w-6 h-6" style={{ color: 'var(--nest-yellow)' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{personalRecords.maxBeers}</div>
                  <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Nejvíc piv za event</div>
                  {personalRecords.maxBeersEvent && <div className="text-[10px] mt-0.5" style={{ color: 'var(--nest-yellow)' }}>{personalRecords.maxBeersEvent}</div>}
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <Wallet className="w-6 h-6" style={{ color: 'var(--nest-yellow)' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{formatCurrency(personalRecords.maxSpending)}</div>
                  <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Nejvyšší útrata</div>
                  {personalRecords.maxSpendingEvent && <div className="text-[10px] mt-0.5" style={{ color: 'var(--nest-yellow)' }}>{personalRecords.maxSpendingEvent}</div>}
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <Moon className="w-6 h-6" style={{ color: 'var(--nest-yellow)' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{personalRecords.longestStay}</div>
                  <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Nejdelší pobyt (nocí)</div>
                  {personalRecords.longestStayEvent && <div className="text-[10px] mt-0.5" style={{ color: 'var(--nest-yellow)' }}>{personalRecords.longestStayEvent}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements */}
        {events.length > 0 && (() => {
          const tierColor: Record<AchievementTier, { bg: string; ring: string; text: string }> = {
            bronze: { bg: 'rgba(180, 83, 9, 0.15)', ring: 'rgba(217, 119, 6, 0.4)', text: '#fbbf24' },
            silver: { bg: 'rgba(148, 163, 184, 0.18)', ring: 'rgba(148, 163, 184, 0.45)', text: '#e2e8f0' },
            gold: { bg: 'rgba(245, 158, 11, 0.2)', ring: 'rgba(245, 158, 11, 0.55)', text: '#fcd34d' },
            platinum: { bg: 'rgba(139, 92, 246, 0.2)', ring: 'rgba(167, 139, 250, 0.55)', text: '#c4b5fd' },
          }
          const tierLabel: Record<AchievementTier, string> = { bronze: 'Bronz', silver: 'Stříbro', gold: 'Zlato', platinum: 'Platina' }

          const formatRarity = (achievementId: string, earnedByMe: boolean) => {
            if (!rarity || rarity.totalIdentities === 0) return null
            const earnedCount = rarity.rarity[achievementId] ?? 0
            const total = rarity.totalIdentities
            const pct = total > 0 ? (earnedCount / total) * 100 : 0
            // Avoid showing 100% if the only earner is the current user but rarity hasn't refreshed yet
            const displayCount = earnedByMe ? Math.max(earnedCount, 1) : earnedCount
            const displayPct = total > 0 ? Math.round((displayCount / total) * 100) : 0
            let rareLabel = ''
            if (displayPct === 0) rareLabel = 'Nikdo nemá'
            else if (displayPct < 10) rareLabel = 'Legendární'
            else if (displayPct < 25) rareLabel = 'Vzácné'
            else if (displayPct < 50) rareLabel = 'Neobvyklé'
            else rareLabel = 'Časté'
            return { earnedCount: displayCount, total, pct: displayPct, rareLabel }
          }

          return (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                  Achievementy
                </h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--nest-yellow)' }}>
                  {earnedCount} / {ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {evaluatedAchievements.map(({ spec, progress: ap }) => {
                  const colors = tierColor[spec.tier]
                  const pct = ap.target > 0 ? Math.min(100, (ap.current / ap.target) * 100) : 0
                  const rarityInfo = formatRarity(spec.id, ap.earned)

                  return (
                    <div
                      key={spec.id}
                      className="rounded-xl p-4 transition-all"
                      style={{
                        backgroundColor: ap.earned ? 'var(--nest-surface)' : 'var(--nest-bg)',
                        border: `1px solid ${ap.earned ? colors.ring : 'var(--nest-border)'}`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{
                            backgroundColor: ap.earned ? colors.bg : 'var(--nest-dark-3, #1f2230)',
                            opacity: ap.earned ? 1 : 0.55,
                          }}
                        >
                          {ap.earned ? spec.emoji : <Lock className="w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-bold"
                              style={{ color: ap.earned ? colors.text : 'var(--nest-text-secondary)' }}
                            >
                              {spec.name}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              {tierLabel[spec.tier]}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--nest-text-tertiary)' }}>
                            {spec.desc}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span style={{ color: 'var(--nest-text-tertiary)' }}>
                            {ap.target === 1
                              ? (ap.earned ? 'Splněno' : 'Zatím ne')
                              : `${ap.current.toLocaleString('cs-CZ')} / ${ap.target.toLocaleString('cs-CZ')}`}
                          </span>
                          {ap.target > 1 && (
                            <span style={{ color: ap.earned ? colors.text : 'var(--nest-text-tertiary)' }}>
                              {Math.round(pct)}%
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--nest-dark-3, #1f2230)' }}>
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: ap.earned ? colors.text : 'var(--nest-text-tertiary)',
                              opacity: ap.earned ? 1 : 0.5,
                            }}
                          />
                        </div>
                      </div>

                      {/* Rarity */}
                      {rarityInfo && (
                        <div className="mt-2.5 flex items-center justify-between text-[11px]" style={{ color: 'var(--nest-text-tertiary)' }}>
                          <span>
                            {rarityInfo.earnedCount} / {rarityInfo.total} ({rarityInfo.pct}%)
                          </span>
                          <span
                            className="font-medium"
                            style={{
                              color: rarityInfo.pct < 10 ? '#c4b5fd'
                                : rarityInfo.pct < 25 ? '#fcd34d'
                                : rarityInfo.pct < 50 ? '#93c5fd'
                                : 'var(--nest-text-tertiary)'
                            }}
                          >
                            {rarityInfo.rareLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Event history */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--nest-text-primary)' }}>
            Historie eventů
          </h2>
          {events.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ border: '1px solid var(--nest-border)', color: 'var(--nest-text-secondary)' }}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
            <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--nest-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
              Zatím žádné eventy. Spáruj své jméno nebo se zaregistruj na akci.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const isExpanded = expandedEvents.has(event.session.id)
              const isPaid = event.settlement?.status === 'paid'

              return (
                <div
                  key={event.session.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
                >
                  {/* Event header — clickable */}
                  <button
                    onClick={() => toggleEvent(event.session.id)}
                    className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                        <Calendar className="w-5 h-5" style={{ color: 'var(--nest-yellow)' }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" style={{ color: 'var(--nest-text-primary)' }}>
                          {event.session.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                            {formatDate(event.session.start_date)}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                            {event.guest.nights_count} {event.guest.nights_count === 1 ? 'noc' : event.guest.nights_count < 5 ? 'noci' : 'nocí'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                          {formatCurrency(event.grandTotal)}
                        </div>
                        {isPaid ? (
                          <span className="text-xs text-green-400 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3 h-3" /> Zaplaceno
                          </span>
                        ) : event.settlement ? (
                          <span className="text-xs text-amber-400">K zaplacení</span>
                        ) : null}
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        style={{ color: 'var(--nest-text-tertiary)' }}
                      />
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--nest-border)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">

                        {/* Accommodation */}
                        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                            <h4 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Ubytování</h4>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'var(--nest-text-secondary)' }}>
                                {event.guest.nights_count} {event.guest.nights_count === 1 ? 'noc' : event.guest.nights_count < 5 ? 'noci' : 'nocí'}
                              </span>
                              <span className="font-medium" style={{ color: 'var(--nest-text-primary)' }}>
                                {formatCurrency(event.nightsTotal)}
                              </span>
                            </div>
                            {event.guest.check_in_date && (
                              <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                {new Date(event.guest.check_in_date).toLocaleDateString('cs-CZ')}
                                {event.guest.check_out_date && ` – ${new Date(event.guest.check_out_date).toLocaleDateString('cs-CZ')}`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Consumption */}
                        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Pizza className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                              <h4 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Občerstvení</h4>
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--nest-yellow)' }}>
                              {formatCurrency(event.snacksTotal)}
                            </span>
                          </div>
                          {event.consumption.length > 0 ? (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {event.consumption.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span style={{ color: 'var(--nest-text-secondary)' }}>
                                    {item.qty}× {item.name}
                                  </span>
                                  <span className="flex-shrink-0 ml-2" style={{ color: 'var(--nest-text-tertiary)' }}>
                                    {formatCurrency(item.totalPrice)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Žádná spotřeba</p>
                          )}
                        </div>

                        {/* Hardware */}
                        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MonitorSmartphone className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                              <h4 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Hardware</h4>
                            </div>
                            {event.hwTotal > 0 && (
                              <span className="text-xs font-bold" style={{ color: 'var(--nest-yellow)' }}>
                                {formatCurrency(event.hwTotal)}
                              </span>
                            )}
                          </div>
                          {event.hardware.length > 0 ? (
                            <div className="space-y-1">
                              {event.hardware.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span style={{ color: 'var(--nest-text-secondary)' }}>
                                    {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                                  </span>
                                  {item.totalPrice > 0 && (
                                    <span className="flex-shrink-0 ml-2" style={{ color: 'var(--nest-text-tertiary)' }}>
                                      {formatCurrency(item.totalPrice)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Žádný HW</p>
                          )}
                        </div>

                        {/* Seats & Games & Tip — compact row */}
                        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-3 gap-3">
                          {/* Seats */}
                          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--nest-bg)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Armchair className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} />
                              <span className="text-xs font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Místo</span>
                            </div>
                            <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                              {event.seats.length > 0 ? event.seats.join(', ') : '—'}
                            </div>
                          </div>

                          {/* Games */}
                          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--nest-bg)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Gamepad2 className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} />
                              <span className="text-xs font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Hlasy</span>
                            </div>
                            <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                              {event.gameVoteCount > 0 ? `${event.gameVoteCount} ${event.gameVoteCount === 1 ? 'hlas' : event.gameVoteCount < 5 ? 'hlasy' : 'hlasů'}` : '—'}
                            </div>
                          </div>

                          {/* Tip */}
                          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--nest-bg)' }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <CreditCard className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} />
                              <span className="text-xs font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Spropitné</span>
                            </div>
                            <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                              {event.tip > 0 ? formatCurrency(event.tip) : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Total summary bar */}
                        <div className="md:col-span-2 lg:col-span-3 rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <div>
                            <span className="text-sm font-medium" style={{ color: 'var(--nest-text-secondary)' }}>Celkem za event</span>
                            {event.guest.deposit > 0 && (
                              <span className="text-xs block" style={{ color: 'var(--nest-text-tertiary)' }}>
                                Záloha: {formatCurrency(event.guest.deposit)}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold" style={{ color: 'var(--nest-yellow)' }}>
                              {formatCurrency(event.grandTotal)}
                            </span>
                            {isPaid && (
                              <span className="flex items-center gap-1 text-xs text-green-400 justify-end mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Zaplaceno
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
