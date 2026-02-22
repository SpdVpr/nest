'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  History,
  LogOut,
  MonitorSmartphone,
  Edit,
  Trash2,
  UtensilsCrossed,
  Gamepad2,
  Copy
} from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [guestsCount, setGuestsCount] = useState(0)
  const [productsCount, setProductsCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [todayConsumption, setTodayConsumption] = useState(0)

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
      const token = localStorage.getItem('admin_token')

      // Fetch all sessions (not just upcoming)
      const sessionResponse = await fetch('/api/admin/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
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

      // Fetch products count
      const productsResponse = await fetch('/api/admin/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProductsCount(productsData.products?.length || 0)
      }

      // Fetch consumption data for revenue and today's consumption
      const consumptionResponse = await fetch('/api/admin/consumption', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let consumptionRevenue = 0
      let todayConsumptionTotal = 0

      if (consumptionResponse.ok) {
        const consumptionData = await consumptionResponse.json()
        const records = consumptionData.records || []

        // Calculate consumption revenue
        consumptionRevenue = records.reduce((sum: number, record: any) => {
          return sum + (record.quantity * (record.products?.price || 0))
        }, 0)

        // Calculate today's consumption
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayRecords = records.filter((record: any) => {
          const recordDate = new Date(record.consumed_at)
          recordDate.setHours(0, 0, 0, 0)
          return recordDate.getTime() === today.getTime()
        })
        todayConsumptionTotal = todayRecords.reduce((sum: number, record: any) => {
          return sum + (record.quantity * (record.products?.price || 0))
        }, 0)
      }

      // Fetch hardware reservations revenue
      const hardwareResponse = await fetch('/api/admin/hardware-revenue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let hardwareRevenue = 0
      if (hardwareResponse.ok) {
        const hardwareData = await hardwareResponse.json()
        hardwareRevenue = hardwareData.totalRevenue || 0
      }

      // Fetch accommodation revenue (guests * nights * price_per_night)
      const accommodationResponse = await fetch('/api/admin/accommodation-revenue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let accommodationRevenue = 0
      if (accommodationResponse.ok) {
        const accommodationData = await accommodationResponse.json()
        accommodationRevenue = accommodationData.totalRevenue || 0
      }

      // Set total revenue (consumption + hardware + accommodation)
      setTotalRevenue(consumptionRevenue + hardwareRevenue + accommodationRevenue)
      setTodayConsumption(todayConsumptionTotal)
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


  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#efefef] shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            The Nest - Admin
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
            <Link
              href="/admin/sessions?create=true"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + Nový event
            </Link>
          </div>

          {sessions.length > 0 ? (
            <div className="bg-[#efefef] rounded-xl shadow overflow-hidden">
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
                            href={`/admin/sessions?copyFrom=${session.id}`}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            title="Vytvořit nový event s nastavením tohoto"
                          >
                            <Copy className="w-4 h-4" />
                          </Link>
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
              <Link
                href="/admin/sessions?create=true"
                className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Vytvořit nový event
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards - Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#efefef] rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hosté</p>
                <p className="text-2xl font-bold text-gray-900">{guestsCount}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-[#efefef] rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produkty</p>
                <p className="text-2xl font-bold text-gray-900">{productsCount}</p>
              </div>
              <Package className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-[#efefef] rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Celkový obrat</p>
                <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(0)} Kč</p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-[#efefef] rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Spotřeba dnes</p>
                <p className="text-2xl font-bold text-gray-900">{todayConsumption.toFixed(0)} Kč</p>
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
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Správa eventů</h3>
            <p className="text-sm text-gray-600">Vytvořit nebo ukončit LAN party</p>
          </Link>

          <Link
            href="/admin/products"
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">🍕 Správa produktů</h3>
            <p className="text-sm text-gray-600">Centrální seznam občerstvení pro všechny LAN</p>
          </Link>

          <Link
            href="/admin/hardware"
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-orange-100 p-4 rounded-full mb-4">
              <MonitorSmartphone className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">💻 Správa Hardware</h3>
            <p className="text-sm text-gray-600">Centrální seznam HW pro všechny LAN</p>
          </Link>

          <Link
            href="/admin/games"
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-violet-100 p-4 rounded-full mb-4">
              <Gamepad2 className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">🎮 Správa her</h3>
            <p className="text-sm text-gray-600">Databáze her k instalaci na PC</p>
          </Link>

          <Link
            href="/admin/meals"
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-amber-100 p-4 rounded-full mb-4">
              <UtensilsCrossed className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">🍽️ Správa jídelníčku</h3>
            <p className="text-sm text-gray-600">Databáze jídel pro jídelníček</p>
          </Link>

          <Link
            href="/admin/guests"
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
          >
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Správa hostů</h3>
            <p className="text-sm text-gray-600">Přidat nebo upravit hosty</p>
          </Link>

          <Link
            href="/admin/consumption"
            className="bg-[#efefef] rounded-xl shadow hover:shadow-lg transition-shadow p-6 flex flex-col items-center text-center"
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