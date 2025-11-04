'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp,
  Settings,
  Calendar,
  History,
  LogOut,
  MonitorSmartphone,
  Edit,
  Trash2
} from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [guestsCount, setGuestsCount] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionStartDate, setNewSessionStartDate] = useState('')
  const [newSessionEndDate, setNewSessionEndDate] = useState('')
  const [newSessionDescription, setNewSessionDescription] = useState('')
  const [savingSession, setSavingSession] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchDashboardData()
    }
  }, [router])

  const fetchDashboardData = async () => {
    try {
      // Fetch all sessions (not just upcoming)
      const sessionResponse = await fetch('/api/admin/sessions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        setSessions(sessionData.sessions || [])
      }

      // Fetch guests count
      const guestsResponse = await fetch('/api/guests')
      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json()
        setGuestsCount(guestsData.guests?.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }
  
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      upcoming: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    const statusLabels: Record<string, string> = {
      draft: 'Návrh',
      upcoming: 'Nadcházející',
      active: 'Aktivní',
      completed: 'Dokončený',
      cancelled: 'Zrušený',
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  const handleDeleteEvent = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Opravdu chceš smazat event "${sessionName}"? Tuto akci nelze vrátit.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Nepodařilo se smazat event')
      }

      fetchDashboardData()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Nepodařilo se smazat event')
    }
  }

  const createSession = async () => {
    if (!newSessionName.trim()) {
      alert('Název eventu je povinný')
      return
    }

    setSavingSession(true)
    try {
      const token = localStorage.getItem('admin_token')
      const sessionData: any = { name: newSessionName }
      
      if (newSessionStartDate) {
        const startDate = new Date(newSessionStartDate)
        startDate.setHours(0, 0, 0, 0)
        sessionData.start_date = startDate.toISOString()
      }
      
      if (newSessionEndDate && newSessionEndDate.trim()) {
        const endDate = new Date(newSessionEndDate)
        endDate.setHours(23, 59, 59, 999)
        sessionData.end_date = endDate.toISOString()
      } else {
        sessionData.end_date = null
      }

      if (newSessionDescription.trim()) {
        sessionData.description = newSessionDescription
      }

      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) throw new Error('Failed to create session')

      setNewSessionName('')
      setNewSessionStartDate('')
      setNewSessionEndDate('')
      setNewSessionDescription('')
      setShowCreateForm(false)
      fetchDashboardData()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Nepodařilo se vytvořit session')
    } finally {
      setSavingSession(false)
    }
  }

  const cancelCreateForm = () => {
    setShowCreateForm(false)
    setNewSessionName('')
    setNewSessionStartDate('')
    setNewSessionEndDate('')
    setNewSessionDescription('')
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            🪺 The Nest - Admin
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Odhlásit se
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Events Selection - Main Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🎯 Vyber Event</h2>
              <p className="text-sm text-gray-600 mt-1">Klikni na event pro zobrazení detailů a statistik</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + Nový event
            </button>
          </div>
          
          {sessions.length > 0 ? (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Název eventu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Termín</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{session.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(session.start_date)}
                        {session.end_date && ` - ${formatDate(session.end_date)}`}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(session.status || 'upcoming')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/sessions/${session.id}`}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            📊 Detail
                          </Link>
                          <Link
                            href={`/admin/sessions/${session.id}?edit=true`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            title="Upravit event"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteEvent(session.id, session.name)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            title="Smazat event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/event/${session.slug}`}
                            target="_blank"
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            🔗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
              <p className="text-yellow-700 font-bold text-lg">⚠️ Žádné eventy</p>
              <p className="text-yellow-600 text-sm mt-1 mb-4">Zatím neexistuje žádný event. Vytvoř si nový!</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Vytvořit nový event
              </button>
            </div>
          )}
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl shadow p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">✨ Nový event</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Název eventu *
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="např. LAN Party - Listopad 2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum začátku
                  </label>
                  <input
                    type="date"
                    value={newSessionStartDate}
                    onChange={(e) => setNewSessionStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum konce
                  </label>
                  <input
                    type="date"
                    value={newSessionEndDate || ''}
                    onChange={(e) => setNewSessionEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popis eventu
                </label>
                <textarea
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                  placeholder="Popis eventu..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={cancelCreateForm}
                  disabled={savingSession}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 disabled:bg-gray-100"
                >
                  Zrušit
                </button>
                <button
                  onClick={createSession}
                  disabled={savingSession}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg disabled:bg-gray-400"
                >
                  {savingSession ? 'Vytvářím...' : 'Vytvořit event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hosté</p>
                <p className="text-2xl font-bold text-gray-900">{guestsCount}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produkty</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <Package className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Celkový obrat</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Spotřeba dnes</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Rychlé akce</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/sessions"
            className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Správa eventů</h3>
            <p className="text-sm text-gray-600">Vytvořit nebo ukončit LAN party</p>
          </Link>

          <Link
            href="/admin/products"
            className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">🍕 Správa produktů</h3>
            <p className="text-sm text-gray-600">Centrální seznam občerstvení pro všechny LAN</p>
          </Link>

          <Link
            href="/admin/hardware"
            className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-orange-100 p-4 rounded-full mb-4">
              <MonitorSmartphone className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">💻 Správa Hardware</h3>
            <p className="text-sm text-gray-600">Centrální seznam HW pro všechny LAN</p>
          </Link>

          <Link
            href="/admin/guests"
            className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Správa hostů</h3>
            <p className="text-sm text-gray-600">Přidat nebo upravit hosty</p>
          </Link>

          <Link
            href="/admin/consumption"
            className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <History className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Historie spotřeby</h3>
            <p className="text-sm text-gray-600">Zobrazit všechny záznamy</p>
          </Link>
        </div>
      </div>
    </div>
  )
}