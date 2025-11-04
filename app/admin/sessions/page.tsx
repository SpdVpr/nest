'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, PlayCircle, StopCircle, Edit, Eye } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'

export default function AdminSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionStartDate, setNewSessionStartDate] = useState('')
  const [newSessionEndDate, setNewSessionEndDate] = useState('')
  const [newSessionDescription, setNewSessionDescription] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchSessions()
    }
  }, [router])

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    if (!newSessionName.trim()) {
      alert('Název eventu je povinný')
      return
    }

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
      fetchSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Nepodařilo se vytvořit session')
    }
  }

  const updateSession = async () => {
    if (!editingSession || !newSessionName.trim()) {
      alert('Název eventu je povinný')
      return
    }

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

      const response = await fetch(`/api/admin/sessions/${editingSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) throw new Error('Failed to update session')

      setNewSessionName('')
      setNewSessionStartDate('')
      setNewSessionEndDate('')
      setNewSessionDescription('')
      setEditingSession(null)
      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Nepodařilo se aktualizovat session')
    }
  }

  const startEditSession = (session: Session) => {
    setEditingSession(session)
    setNewSessionName(session.name)
    const startDate = session.start_date ? formatDateTimeLocal(new Date(session.start_date)) : ''
    const endDate = session.end_date ? formatDateTimeLocal(new Date(session.end_date)) : ''
    setNewSessionStartDate(startDate)
    setNewSessionEndDate(endDate)
    setNewSessionDescription(session.description || '')
    setShowCreateForm(false)
  }

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const cancelEdit = () => {
    setEditingSession(null)
    setNewSessionName('')
    setNewSessionStartDate('')
    setNewSessionEndDate('')
    setNewSessionDescription('')
  }

  const toggleSessionActive = async (sessionId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) throw new Error('Failed to update session')

      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Nepodařilo se aktualizovat session')
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/admin/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Správa eventů</h1>
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nový event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {editingSession && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">✏️ Upravit event</h3>
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
                  onClick={cancelEdit}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  Zrušit
                </button>
                <button
                  onClick={updateSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg"
                >
                  Uložit změny
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Vytvořit nový event</h3>
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
                    id="create-end-date-input"
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
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewSessionName('')
                    setNewSessionStartDate('')
                    setNewSessionEndDate('')
                    setNewSessionDescription('')
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  Zrušit
                </button>
                <button
                  onClick={createSession}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg"
                >
                  Vytvořit event
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Název</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Začátek</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konec</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{session.name}</td>
                  <td className="px-6 py-4 text-sm">
                    {session.slug ? (
                      <Link
                        href={`/event/${session.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        /event/{session.slug}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(session.start_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {session.end_date ? formatDate(session.end_date) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {session.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                        Aktivní
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                        Neaktivní
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="flex items-center text-purple-600 hover:text-purple-700 font-medium"
                        title="Detail"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detail
                      </Link>
                      <button
                        onClick={() => startEditSession(session)}
                        className="flex items-center text-blue-600 hover:text-blue-700"
                        title="Upravit"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Upravit
                      </button>
                      <button
                        onClick={() => toggleSessionActive(session.id, session.is_active)}
                        className={`flex items-center ${
                          session.is_active
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {session.is_active ? (
                          <>
                            <StopCircle className="w-4 h-4 mr-1" />
                            Ukončit
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-1" />
                            Aktivovat
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}