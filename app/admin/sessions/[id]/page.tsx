'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Monitor, Utensils, TrendingUp, Loader2, Edit2, Check, X, Edit, UtensilsCrossed } from 'lucide-react'
import { Session, Guest, MenuItem, MealType } from '@/types/database.types'
import { HardwareItem } from '@/types/hardware.types'
import { formatDate, formatDateOnly } from '@/lib/utils'

interface HardwareReservation {
  id: string
  guest_id: string
  hardware_item_id: string
  quantity: number
  nights_count: number
  total_price: number
  created_at: string
}

interface ConsumptionRecord {
  id: string
  guest_id: string
  quantity: number
  products?: {
    name: string
    price: number
  }
  consumed_at: string
}

interface ExtendedGuest extends Guest {
  nights_count: number
}

interface ExtendedSession extends Session {
  price_per_night: number
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params?.id as string

  const [session, setSession] = useState<ExtendedSession | null>(null)
  const [guests, setGuests] = useState<ExtendedGuest[]>([])
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([])
  const [reservations, setReservations] = useState<HardwareReservation[]>([])
  const [consumption, setConsumption] = useState<ConsumptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState('0')
  const [savingPrice, setSavingPrice] = useState(false)
  const [editingEvent, setEditingEvent] = useState(false)
  const [editEventName, setEditEventName] = useState('')
  const [editEventStartDate, setEditEventStartDate] = useState('')
  const [editEventEndDate, setEditEventEndDate] = useState('')
  const [editEventDescription, setEditEventDescription] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuEnabled, setMenuEnabled] = useState(false)
  const [guestSelections, setGuestSelections] = useState<Record<string, any>>({})

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchEventData()
    }
  }, [sessionId, router])

  useEffect(() => {
    if (session && searchParams.get('edit') === 'true') {
      startEditEvent(session)
    }
  }, [session, searchParams])

  const startEditEvent = (sessionToEdit: ExtendedSession) => {
    setEditingEvent(true)
    setEditEventName(sessionToEdit.name)
    const startDate = sessionToEdit.start_date ? formatDateTimeLocal(new Date(sessionToEdit.start_date)) : ''
    const endDate = sessionToEdit.end_date ? formatDateTimeLocal(new Date(sessionToEdit.end_date)) : ''
    setEditEventStartDate(startDate)
    setEditEventEndDate(endDate)
    setEditEventDescription(sessionToEdit.description || '')
  }

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSaveEvent = async () => {
    if (!editEventName.trim()) {
      alert('Název eventu je povinný')
      return
    }

    setSavingEvent(true)
    try {
      const token = localStorage.getItem('admin_token')
      const eventData: any = { name: editEventName }

      if (editEventStartDate) {
        const startDate = new Date(editEventStartDate)
        startDate.setHours(0, 0, 0, 0)
        eventData.start_date = startDate.toISOString()
      }

      if (editEventEndDate && editEventEndDate.trim()) {
        const endDate = new Date(editEventEndDate)
        endDate.setHours(23, 59, 59, 999)
        eventData.end_date = endDate.toISOString()
      } else {
        eventData.end_date = null
      }

      if (editEventDescription.trim()) {
        eventData.description = editEventDescription
      }

      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) throw new Error('Failed to update session')

      setEditingEvent(false)
      fetchEventData()
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Nepodařilo se aktualizovat event')
    } finally {
      setSavingEvent(false)
    }
  }

  const cancelEditEvent = () => {
    setEditingEvent(false)
    setEditEventName('')
    setEditEventStartDate('')
    setEditEventEndDate('')
    setEditEventDescription('')
    router.push(`/admin/sessions/${sessionId}`)
  }

  const fetchEventData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')

      // Fetch session
      const sessionRes = await fetch(`/api/admin/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setSession(data.session)
        setNewPrice((data.session?.price_per_night || 0).toString())

        // Use slug to fetch guests
        const sessionSlug = data.session?.slug || sessionId
        const guestsRes = await fetch(`/api/event/${sessionSlug}/guests`)
        if (guestsRes.ok) {
          const guestsData = await guestsRes.json()
          setGuests(guestsData.guests || [])
        }
      }

      // Fetch hardware items
      const itemsRes = await fetch('/api/hardware/items')
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setHardwareItems(data.items || [])
      }

      // Fetch hardware reservations for this session
      const reservRes = await fetch(`/api/admin/sessions/${sessionId}/reservations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (reservRes.ok) {
        const data = await reservRes.json()
        setReservations(data.reservations || [])
      }

      // Fetch consumption for this session
      const consumRes = await fetch(`/api/admin/sessions/${sessionId}/consumption`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (consumRes.ok) {
        const data = await consumRes.json()
        setConsumption(data.consumption || [])
      }

      // Fetch menu items for this session
      const menuRes = await fetch(`/api/admin/sessions/${sessionId}/menu`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (menuRes.ok) {
        const data = await menuRes.json()
        setMenuItems(data.items || [])
        setMenuEnabled(data.enabled || false)
      }
    } catch (error) {
      console.error('Error fetching event data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePrice = async () => {
    if (!session) return

    const price = parseFloat(newPrice)
    if (isNaN(price) || price < 0) {
      alert('Zadej platnou cenu')
      return
    }

    setSavingPrice(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ price_per_night: price })
      })

      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
        setEditingPrice(false)
      } else {
        alert('Chyba při ukládání')
      }
    } catch (error) {
      console.error('Error saving price:', error)
      alert('Chyba při ukládání')
    } finally {
      setSavingPrice(false)
    }
  }

  const getGuestName = (guestId: string) => {
    return guests.find(g => g.id === guestId)?.name || 'Neznámý host'
  }

  const getGuestNights = (guestId: string) => {
    return guests.find(g => g.id === guestId)?.nights_count || 1
  }

  const getHardwareName = (itemId: string) => {
    return hardwareItems.find(h => h.id === itemId)?.name || 'Neznámý HW'
  }

  const getGuestHardware = (guestId: string) => {
    const guestReservations = reservations.filter(r => r.guest_id === guestId)
    return guestReservations.map(r => ({
      name: getHardwareName(r.hardware_item_id),
      quantity: r.quantity || 1,
      price: r.total_price
    }))
  }

  const getTotalHardwareByGuest = (guestId: string) => {
    return reservations
      .filter(r => r.guest_id === guestId)
      .reduce((sum, r) => sum + r.total_price, 0)
  }

  const getTotalConsumptionByGuest = (guestId: string) => {
    return consumption
      .filter(c => c.guest_id === guestId)
      .reduce((sum, c) => sum + (c.quantity * (c.products?.price || 0)), 0)
  }

  const getTotalPriceByGuest = (guestId: string) => {
    const nights = getGuestNights(guestId)
    const nightsPrice = nights * (session?.price_per_night || 0)
    const hardwarePrice = getTotalHardwareByGuest(guestId)
    const foodPrice = getTotalConsumptionByGuest(guestId)
    return nightsPrice + hardwarePrice + foodPrice
  }

  const getTotalRevenue = () => {
    let total = 0
    // Add nights revenue
    total += guests.reduce((sum, g) => sum + (g.nights_count * (session?.price_per_night || 0)), 0)
    // Add hardware revenue
    total += reservations.reduce((sum, r) => sum + r.total_price, 0)
    // Add consumption revenue
    total += consumption.reduce((sum, c) => sum + (c.quantity * (c.products?.price || 0)), 0)
    return total
  }

  const getHardwareStats = () => {
    const totalReservations = reservations.reduce((sum, r) => sum + (r.quantity || 1), 0)
    const uniqueHardwareIds = new Set(reservations.map(r => r.hardware_item_id))
    return {
      totalReservations,
      uniqueItems: uniqueHardwareIds.size
    }
  }

  const getMenuDays = (): { dayIndex: number; date: Date; label: string }[] => {
    if (!session?.start_date) return []
    const start = new Date(session.start_date)
    const end = session.end_date ? new Date(session.end_date) : start
    const days: { dayIndex: number; date: Date; label: string }[] = []
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)
    let dayIndex = 0
    while (current <= endDate) {
      days.push({
        dayIndex,
        date: new Date(current),
        label: `Den ${dayIndex + 1} – ${formatDateOnly(current)}`,
      })
      current.setDate(current.getDate() + 1)
      dayIndex++
    }
    return days
  }

  const getMealsForDay = (dayIndex: number): MenuItem[] => {
    return menuItems
      .filter(item => item.day_index === dayIndex)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  const getMealTypeLabel = (type: MealType): string => {
    switch (type) {
      case 'breakfast': return '🌅 Snídaně'
      case 'lunch': return '☀️ Oběd'
      case 'dinner': return '🌙 Večeře'
    }
  }

  const getGuestsDietaryInfo = () => {
    return guests.filter(g =>
      (g.dietary_restrictions && g.dietary_restrictions.length > 0) || g.dietary_note
    )
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na dashboard
          </Link>
          <p className="text-gray-600">Event nenalezen</p>
        </div>
      </div>
    )
  }

  const hardwareStats = getHardwareStats()
  const totalRevenue = getTotalRevenue()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/admin/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zpět na dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.name}</h1>
              <p className="text-gray-600">
                {formatDate(session.start_date)}
                {session.end_date && ` - ${formatDate(session.end_date)}`}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/admin/sessions/${sessionId}/menu`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
              >
                <Utensils className="w-5 h-5" />
                Jídelníček
              </Link>
              <Link
                href={`/admin/sessions/${sessionId}/stock`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                <Utensils className="w-5 h-5" />
                Pochutiny
              </Link>
              <Link
                href={`/event/${session.slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Otevřít event →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Event Form */}
      {editingEvent && (
        <div className="bg-blue-50 border-b border-blue-300 py-6">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Upravit event
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Název eventu *
                </label>
                <input
                  type="text"
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
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
                    value={editEventStartDate}
                    onChange={(e) => setEditEventStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Datum konce
                  </label>
                  <input
                    type="date"
                    value={editEventEndDate || ''}
                    onChange={(e) => setEditEventEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popis eventu
                </label>
                <textarea
                  value={editEventDescription}
                  onChange={(e) => setEditEventDescription(e.target.value)}
                  placeholder="Popis eventu..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={cancelEditEvent}
                  disabled={savingEvent}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900 disabled:bg-gray-100"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={savingEvent}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg disabled:bg-gray-400"
                >
                  {savingEvent ? 'Ukládám...' : 'Uložit změny'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Guests Count */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Přihlášení hosté</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{guests.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          {/* Hardware Reservations */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">HW rezervace</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{hardwareStats.totalReservations}</p>
                <p className="text-xs text-gray-500 mt-1">{hardwareStats.uniqueItems} unikátní položky</p>
              </div>
              <Monitor className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </div>

          {/* Price Per Night */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Cena za noc</p>
                {editingPrice ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="Cena"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      disabled={savingPrice}
                    />
                    <button
                      onClick={handleSavePrice}
                      disabled={savingPrice}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingPrice(false)
                        setNewPrice((session?.price_per_night || 0).toString())
                      }}
                      disabled={savingPrice}
                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-3xl font-bold text-gray-900">{session.price_per_night} Kč</p>
                    <button
                      onClick={() => setEditingPrice(true)}
                      className="p-2 text-gray-500 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Celkový obrat</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalRevenue} Kč</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Guests Table with Total Price */}
        <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">👥 Přihlášení hosté ({guests.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jméno</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Noci</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HW (Kč)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jídlo (Kč)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-red-600">CENA CELKEM (Kč)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {guests.length > 0 ? (
                  guests.map((guest) => {
                    const hwPrice = getTotalHardwareByGuest(guest.id)
                    const foodPrice = getTotalConsumptionByGuest(guest.id)
                    const totalPrice = getTotalPriceByGuest(guest.id)
                    return (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{guest.name}</td>
                        <td className="px-6 py-4 text-sm bg-blue-50">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                            {guest.nights_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{hwPrice} Kč</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{foodPrice} Kč</td>
                        <td className="px-6 py-4 font-bold text-red-600 text-lg">{totalPrice} Kč</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(guest.created_at)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Zatím žádní hosté
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hardware Reservations Detail */}
        {reservations.length > 0 && (
          <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">💻 HW Rezervace</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Položka</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Noci</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cena (Kč)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vytvořeno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{getGuestName(res.guest_id)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="block bg-blue-50 px-2 py-1 rounded text-blue-700 text-xs font-medium">
                          {getHardwareName(res.hardware_item_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{res.quantity || 1}×</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{res.nights_count}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{res.total_price} Kč</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(res.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Menu Overview */}
        {menuEnabled && menuItems.length > 0 && (
          <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">🍽️ Jídelníček ({menuItems.length} jídel)</h2>
              <Link
                href={`/admin/sessions/${sessionId}/menu`}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Upravit jídelníček →
              </Link>
            </div>
            <div className="p-6">
              {/* Menu by days - compact grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {getMenuDays().map(day => {
                  const dayMeals = getMealsForDay(day.dayIndex)
                  if (dayMeals.length === 0) return null
                  return (
                    <div key={day.dayIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-800 text-white">
                        <span className="font-semibold text-sm">📅 {day.label}</span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {dayMeals.map((meal, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 w-12 text-xs flex-shrink-0">{meal.time}</span>
                            <span className="font-medium text-gray-700 flex-shrink-0">
                              {getMealTypeLabel(meal.meal_type).split(' ')[0]}
                            </span>
                            <span className="text-gray-900 truncate">
                              {meal.description || <span className="text-gray-400 italic">—</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Guest dietary restrictions */}
              {getGuestsDietaryInfo().length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    ⚠️ Stravovací omezení hostů
                    <span className="text-sm font-normal text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      {getGuestsDietaryInfo().length} hostů
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {getGuestsDietaryInfo().map(guest => (
                      <div key={guest.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <span className="font-semibold text-gray-900 w-32 flex-shrink-0">{guest.name}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {guest.dietary_restrictions?.map((r: string) => (
                            <span key={r} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                              {r === 'vegan' ? '🌱 Vegan' : r === 'vegetarian' ? '🥬 Vegetarián' : r === 'gluten-free' ? '🌾 Bez lepku' : r === 'lactose-free' ? '🥛 Bez laktózy' : r}
                            </span>
                          ))}
                          {guest.dietary_note && (
                            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                              📝 {guest.dietary_note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {getGuestsDietaryInfo().length === 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500">✅ Žádný host nemá stravovací omezení</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Consumption History */}
        {consumption.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">🍕 Nákupy (Spotřeba)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produkt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cena/Ks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Celkem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Čas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {consumption.map((rec) => {
                    const price = rec.products?.price || 0
                    const subtotal = rec.quantity * price
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{getGuestName(rec.guest_id)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{rec.products?.name || 'Neznámý produkt'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{rec.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{price} Kč</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{subtotal} Kč</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(rec.consumed_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}