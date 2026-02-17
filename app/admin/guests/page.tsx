'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Users, Loader2, Trash2, ChevronRight, Calendar, Moon } from 'lucide-react'
import { Guest, Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'

export default function AdminGuestsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newGuestName, setNewGuestName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchData()
    }
  }, [router])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch active session
      const sessionRes = await fetch('/api/sessions/active')
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setActiveSession(sessionData.session)
      }

      // Fetch guests
      const guestsRes = await fetch('/api/guests')
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGuestName.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGuestName.trim() }),
      })

      if (response.ok) {
        setNewGuestName('')
        setShowAddModal(false)
        fetchData()
      } else {
        alert('Nepodařilo se přidat hosta')
      }
    } catch (error) {
      console.error('Error adding guest:', error)
      alert('Chyba při přidávání hosta')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#efefef] shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zpět na dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Správa hostů</h1>
              {activeSession && (
                <p className="text-gray-600 mt-1">
                  {activeSession.name} - {formatDate(activeSession.start_date)}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Přidat hosta
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!activeSession ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-600 font-medium">⚠️ Není aktivní žádný event</p>
            <p className="text-red-500 text-sm mt-1">
              Vytvoř nový event v sekci{' '}
              <Link href="/admin/sessions" className="underline font-semibold">
                Správa eventů
              </Link>
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="bg-[#efefef] rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">
                  Registrovaní hosté
                </h2>
              </div>
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">
                  Celkem: <span className="text-2xl font-bold text-blue-700">{guests.length}</span> {guests.length === 1 ? 'host' : guests.length >= 2 && guests.length <= 4 ? 'hosté' : 'hostů'}
                </p>
              </div>
            </div>

            {guests.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-4">Zatím nejsou žádní hosté</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-green-600 hover:text-green-700 font-semibold"
                >
                  Přidej prvního hosta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {guests.map((guest) => (
                  <Link
                    key={guest.id}
                    href={`/admin/guests/${guest.id}`}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {guest.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Registrace: {new Date(guest.created_at).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      {/* Počet nocí */}
                      <div className="flex items-center gap-2 text-sm">
                        <Moon className="w-4 h-4 text-indigo-500" />
                        <span className="text-gray-600">
                          <span className="font-semibold text-gray-900">{guest.nights_count}</span> {guest.nights_count === 1 ? 'noc' : guest.nights_count >= 2 && guest.nights_count <= 4 ? 'noci' : 'nocí'}
                        </span>
                      </div>

                      {/* Datum příjezdu a odjezdu */}
                      {guest.check_in_date && guest.check_out_date ? (
                        <div className="flex items-start gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <div className="text-gray-600">
                            <div>
                              <span className="text-xs text-gray-500">Příjezd:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {new Date(guest.check_in_date).toLocaleDateString('cs-CZ', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Odjezd:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {new Date(guest.check_out_date).toLocaleDateString('cs-CZ', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400 italic">Datum příjezdu/odjezdu neuvedeno</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#efefef] rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Přidat nového hosta</h2>
            <p className="text-gray-600 mb-6">
              Host bude přidán k eventu: <strong>{activeSession?.name}</strong>
            </p>
            <form onSubmit={handleAddGuest}>
              <input
                type="text"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                placeholder="Jméno hosta..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 mb-4"
                autoFocus
                disabled={submitting}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewGuestName('')
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={!newGuestName.trim() || submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {submitting ? 'Přidávám...' : 'Přidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}