'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { BedDouble, Users, UserCheck, Loader2 } from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { useGuestAuth, useCurrentGuest } from '@/lib/auth-context'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'

const ROOMS = [
  { id: 'dolni', name: 'Dolní pokoj', beds: 7, floor: 'Přízemí' },
  { id: 'horni-vlevo', name: 'Horní vlevo', beds: 6, floor: '1. patro' },
  { id: 'horni-vpravo', name: 'Horní vpravo', beds: 6, floor: '1. patro' },
  { id: 'mezipatro', name: 'Mezipatro', beds: 7, floor: 'Mezipatro' },
]

export default function AccommodationPage() {
  const params = useParams()
  const slug = params?.slug as string
  const { firebaseUser, isAuthenticated, userProfile } = useGuestAuth()
  const storedGuest = useCurrentGuest(slug)

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const currentGuestId = storedGuest?.id || null

  useEffect(() => {
    if (slug) {
      fetchData()
    }
  }, [slug])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sessionRes, guestsRes] = await Promise.all([
        fetch(`/api/event/${slug}`),
        fetch(`/api/event/${slug}/guests`),
      ])

      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setSession(data.session)
      }
      if (guestsRes.ok) {
        const data = await guestsRes.json()
        setGuests(data.guests || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentGuest = guests.find(g => g.id === currentGuestId)

  const selectRoom = async (roomId: string) => {
    if (!currentGuestId || saving) return

    // Toggle: if already selected this room, deselect
    const newRoom = currentGuest?.room === roomId ? null : roomId

    setSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`/api/event/${slug}/guests/${currentGuestId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ room: newRoom }),
      })

      if (res.ok) {
        // Update local state
        setGuests(prev => prev.map(g =>
          g.id === currentGuestId ? { ...g, room: newRoom } : g
        ))
      } else {
        const data = await res.json()
        alert(data.error || 'Chyba při ukládání')
      }
    } catch {
      alert('Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <NestLoading message="Načítám pokoje..." />
  }

  const totalBeds = ROOMS.reduce((sum, r) => sum + r.beds, 0)
  const totalOccupied = guests.filter(g => g.room).length

  if (session?.accommodation_enabled === false) {
    return (
      <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Ubytování" maxWidth="max-w-2xl">
        <div className="nest-card-elevated p-6 mt-4 text-center">
          <BedDouble className="w-10 h-10 mx-auto mb-3 text-[var(--nest-white-40)]" />
          <h1 className="text-xl font-bold mb-2">Výběr pokojů je vypnutý</h1>
          <p className="text-sm text-[var(--nest-white-60)]">Organizátor pro tuto akci výběr ubytování nepovolil.</p>
        </div>
      </NestPage>
    )
  }

  return (
    <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Ubytování" maxWidth="max-w-2xl">
      <div className="nest-card-elevated p-6 mt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--nest-yellow)]/10 flex items-center justify-center flex-shrink-0">
              <BedDouble className="w-5 h-5 text-[var(--nest-yellow)]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Ubytování</h1>
              <p className="text-xs text-[var(--nest-white-40)] mt-0.5">Vyber si pokoj, kde chceš spát</p>
            </div>
          </div>
          <div className="bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20 px-3 py-1.5 rounded-xl text-center flex-shrink-0">
            <p className="text-xl font-bold text-[var(--nest-yellow)]">{totalOccupied}/{totalBeds}</p>
            <p className="text-[10px] text-[var(--nest-white-40)]">postelí</p>
          </div>
        </div>

        {/* Current guest info */}
        {currentGuest && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <UserCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-xs text-green-300">
              Vybíráš jako <span className="font-semibold text-green-200">{currentGuest.name}</span>
              {currentGuest.room && (
                <> — pokoj: <span className="font-semibold text-green-200">{ROOMS.find(r => r.id === currentGuest.room)?.name || currentGuest.room}</span></>
              )}
            </span>
          </div>
        )}

        {!currentGuestId && (
          <div className="mb-4 p-3 bg-[var(--nest-error)]/10 border border-[var(--nest-error)]/20 rounded-xl text-[var(--nest-error)] text-xs">
            Pro výběr pokoje se nejdřív zaregistruj na akci.
          </div>
        )}

        {/* Room cards */}
        <div className="space-y-3">
          {ROOMS.map((room) => {
            const occupants = guests.filter(g => g.room === room.id)
            const isFull = occupants.length >= room.beds
            const isSelected = currentGuest?.room === room.id

            return (
              <div
                key={room.id}
                className={`rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-[var(--nest-yellow)]/50 bg-[var(--nest-yellow)]/5'
                    : isFull
                    ? 'border-[var(--nest-dark-4)] opacity-60'
                    : 'border-[var(--nest-dark-4)] hover:border-[var(--nest-yellow)]/30'
                }`}
              >
                {/* Room header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BedDouble className={`w-4 h-4 ${isSelected ? 'text-[var(--nest-yellow)]' : 'text-[var(--nest-white-60)]'}`} />
                    <h3 className="font-bold text-sm">{room.name}</h3>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--nest-yellow)]/15 text-[var(--nest-yellow)] font-semibold">
                        Tvůj výběr
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      isFull ? 'text-[var(--nest-error)]' : occupants.length > 0 ? 'text-[var(--nest-yellow)]' : 'text-[var(--nest-white-40)]'
                    }`}>
                      {occupants.length}/{room.beds} postelí
                    </span>
                    {currentGuestId && (
                      <button
                        onClick={() => selectRoom(room.id)}
                        disabled={saving || (isFull && !isSelected)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[var(--nest-error)]/10 text-[var(--nest-error)] hover:bg-[var(--nest-error)]/20'
                            : isFull
                            ? 'bg-[var(--nest-dark-4)] text-[var(--nest-white-40)] cursor-not-allowed'
                            : 'bg-[var(--nest-yellow)] text-[var(--nest-dark)] hover:bg-[var(--nest-yellow-dark)]'
                        }`}
                      >
                        {saving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isSelected ? (
                          'Zrušit'
                        ) : isFull ? (
                          'Plno'
                        ) : (
                          'Vybrat'
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Capacity bar */}
                <div className="w-full h-1.5 bg-[var(--nest-dark-3)] rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(occupants.length / room.beds) * 100}%`,
                      backgroundColor: isFull ? 'var(--nest-error)' : 'var(--nest-yellow)',
                    }}
                  />
                </div>

                {/* Occupants list */}
                {occupants.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {occupants.map(g => (
                      <span
                        key={g.id}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border ${
                          g.id === currentGuestId
                            ? 'bg-[var(--nest-yellow)]/10 border-[var(--nest-yellow)]/30 text-[var(--nest-yellow)]'
                            : 'bg-[var(--nest-dark-3)] border-[var(--nest-dark-4)] text-[var(--nest-white-60)]'
                        }`}
                      >
                        {g.id === currentGuestId && <UserCheck className="w-2.5 h-2.5" />}
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[var(--nest-white-40)] italic">Zatím nikdo</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </NestPage>
  )
}
