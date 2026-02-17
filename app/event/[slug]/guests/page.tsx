'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Users, UserCheck, Calendar, Moon, Armchair, LogOut } from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'

export default function GuestsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentGuest, setCurrentGuest] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [seatReservations, setSeatReservations] = useState<{ id: string, seat_id: string, guest_id: string, guest_name: string }[]>([])
  const [unregistering, setUnregistering] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (slug) {
      fetchData()
    }
  }, [slug])

  useEffect(() => {
    if (mounted && slug) {
      const guest = guestStorage.getCurrentGuest(slug)
      setCurrentGuest(guest?.id || null)
    }
  }, [mounted, slug])

  const fetchData = async () => {
    try {
      setLoading(true)

      const sessionRes = await fetch(`/api/event/${slug}`)
      let sessionData: any = null
      if (sessionRes.ok) {
        sessionData = await sessionRes.json()
        setSession(sessionData.session)
      }

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests || [])
      }

      if (sessionData?.session?.id) {
        const seatsRes = await fetch(`/api/seats/reservations?session_id=${sessionData.session.id}`)
        if (seatsRes.ok) {
          const seatsData = await seatsRes.json()
          setSeatReservations(seatsData.reservations || [])
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSelect = (guest: Guest) => {
    guestStorage.setCurrentGuest({
      id: guest.id,
      name: guest.name,
      session_slug: slug
    })
    setCurrentGuest(guest.id)
  }

  if (loading) {
    return <NestLoading message="Načítám hosty..." />
  }

  return (
    <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Registrovaní lidé" maxWidth="max-w-2xl">
      <div className="nest-card-elevated p-6 mt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--nest-yellow)]/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[var(--nest-yellow)]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Registrovaní lidé</h1>
              {session && (
                <p className="text-xs text-[var(--nest-white-40)] mt-0.5">{session.name}</p>
              )}
            </div>
          </div>
          <div className="bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20 px-3 py-1.5 rounded-xl text-center flex-shrink-0">
            <p className="text-xl font-bold text-[var(--nest-yellow)]">{guests.length}</p>
            <p className="text-[10px] text-[var(--nest-white-40)]">
              {guests.length === 1 ? 'host' : guests.length >= 2 && guests.length <= 4 ? 'hosté' : 'hostů'}
            </p>
          </div>
        </div>

        {guests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--nest-white-60)] text-sm mb-4">Zatím nejsou registrováni žádní uživatelé</p>
            <Link
              href={`/event/${slug}/register`}
              className="text-[var(--nest-yellow)] hover:underline font-semibold text-sm"
            >
              Zaregistruj se
            </Link>
          </div>
        ) : (
          <>
            {/* Compact Table */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[var(--nest-white-60)] mb-3">Rychlý přehled</h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--nest-dark-4)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[var(--nest-dark-3)] border-b border-[var(--nest-dark-4)]">
                      <th className="text-left py-2.5 px-3 font-semibold text-[var(--nest-white-60)] text-xs">Jméno</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-[var(--nest-white-60)] text-xs">Místo</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-[var(--nest-white-60)] text-xs">Noci</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-[var(--nest-white-60)] text-xs">Dny</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest, index) => {
                      const isCurrentGuest = currentGuest === guest.id
                      let dayRange = '-'
                      if (guest.check_in_date && guest.check_out_date && session?.start_date) {
                        const sessionStart = new Date(session.start_date)
                        sessionStart.setHours(0, 0, 0, 0)
                        const checkIn = new Date(guest.check_in_date)
                        checkIn.setHours(0, 0, 0, 0)
                        const checkOut = new Date(guest.check_out_date)
                        checkOut.setHours(0, 0, 0, 0)
                        const startDay = Math.floor((checkIn.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        const endDay = Math.floor((checkOut.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        dayRange = startDay === endDay ? `${startDay}` : `${startDay}-${endDay}`
                      }

                      return (
                        <tr
                          key={guest.id}
                          className={`border-b border-[var(--nest-dark-4)] transition-colors ${isCurrentGuest ? 'bg-[var(--nest-yellow)]/5' : 'hover:bg-[var(--nest-dark-3)]'}`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-xs">{guest.name}</span>
                              {isCurrentGuest && (
                                <UserCheck className="w-3 h-3 text-[var(--nest-success)]" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {(() => {
                              const seats = seatReservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
                              return seats.length > 0 ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--nest-success)]/10 text-[var(--nest-success)] border border-[var(--nest-success)]/20 font-semibold">
                                  🪑 {seats.join(', ')}
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--nest-white-40)]">—</span>
                              )
                            })()}
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs">{guest.nights_count}</td>
                          <td className="py-2.5 px-3 text-center text-xs font-medium">{dayRange}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Cards */}
            <h2 className="text-sm font-semibold text-[var(--nest-white-60)] mb-3">Detailní přehled</h2>
            <div className="space-y-2">
              {guests.map((guest) => {
                const isCurrentGuest = currentGuest === guest.id
                return (
                  <button
                    key={guest.id}
                    onClick={() => handleGuestSelect(guest)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all text-sm ${isCurrentGuest
                      ? 'border-[var(--nest-yellow)]/40 bg-[var(--nest-yellow)]/5'
                      : 'border-[var(--nest-dark-4)] hover:border-[var(--nest-yellow)]/20 hover:bg-[var(--nest-dark-3)]'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-bold text-sm">{guest.name}</p>
                      {isCurrentGuest && (
                        <span className="inline-flex items-center gap-1 bg-[var(--nest-success)]/10 px-2 py-0.5 rounded-full text-[10px] text-[var(--nest-success)] font-medium border border-[var(--nest-success)]/20">
                          <UserCheck className="w-3 h-3" />
                          Přihlášen/a
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--nest-white-60)]">
                        <Moon className="w-3 h-3 text-[var(--nest-yellow)]" />
                        <span>
                          <span className="font-semibold text-[var(--nest-white)]">{guest.nights_count}</span>{' '}
                          {guest.nights_count === 1 ? 'noc' : guest.nights_count >= 2 && guest.nights_count <= 4 ? 'noci' : 'nocí'}
                        </span>
                      </div>

                      {(() => {
                        const seats = seatReservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
                        return seats.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--nest-white-60)]">
                            <Armchair className="w-3 h-3 text-[var(--nest-success)]" />
                            <span>Místo: <span className="font-semibold text-[var(--nest-success)]">{seats.join(', ')}</span></span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--nest-white-40)]">
                            <Armchair className="w-3 h-3" />
                            <span className="italic">Bez místa</span>
                          </div>
                        )
                      })()}

                      {guest.check_in_date && guest.check_out_date ? (
                        <div className="flex items-start gap-1.5 text-xs text-[var(--nest-white-60)]">
                          <Calendar className="w-3 h-3 text-[var(--nest-yellow)] mt-0.5 flex-shrink-0" />
                          <div>
                            <div>
                              <span className="text-[var(--nest-white-40)]">Příjezd:</span>{' '}
                              <span className="font-medium text-[var(--nest-white)]">
                                {new Date(guest.check_in_date).toLocaleDateString('cs-CZ', {
                                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--nest-white-40)]">Odjezd:</span>{' '}
                              <span className="font-medium text-[var(--nest-white)]">
                                {new Date(guest.check_out_date).toLocaleDateString('cs-CZ', {
                                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--nest-white-40)]">
                          <Calendar className="w-3 h-3" />
                          <span className="italic">Datum příjezdu/odjezdu neuvedeno</span>
                        </div>
                      )}
                    </div>

                    {/* Unregister */}
                    {isCurrentGuest && session && new Date(session.start_date) > new Date() && (
                      <div className="mt-3 pt-3 border-t border-[var(--nest-dark-4)]">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm('Opravdu se chceš odhlásit z akce?\n\nBudou zrušeny všechny tvoje rezervace (HW, místo, hry).')) return
                            setUnregistering(true)
                            try {
                              const res = await fetch(`/api/event/${slug}/guests/${guest.id}`, { method: 'DELETE' })
                              if (res.ok) {
                                guestStorage.clearCurrentGuest()
                                setCurrentGuest(null)
                                alert('Byl/a jsi odhlášen/a z akce. Všechny rezervace byly zrušeny.')
                                fetchData()
                              } else {
                                const data = await res.json()
                                alert(`Chyba: ${data.error || 'Nepodařilo se odhlásit'}`)
                              }
                            } catch (err) {
                              alert('Chyba při odhlašování z akce')
                            } finally {
                              setUnregistering(false)
                            }
                          }}
                          disabled={unregistering}
                          className="inline-flex items-center gap-1.5 text-[var(--nest-error)] hover:bg-[var(--nest-error)]/10 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium"
                        >
                          <LogOut className="w-3 h-3" />
                          {unregistering ? 'Odhlašuji...' : 'Odhlásit se z akce'}
                        </button>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-6 pt-6 border-t border-[var(--nest-dark-4)]">
          <Link
            href={`/event/${slug}/snacks`}
            className="w-full block text-center bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-dark)] py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            Přejít na občerstvení
          </Link>
        </div>
      </div>
    </NestPage>
  )
}
