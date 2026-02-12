'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Monitor, Utensils, TrendingUp, Loader2, Edit2, Check, X, Edit, UtensilsCrossed } from 'lucide-react'
import { Session, Guest, MenuItem, MealType, Game, GameLibraryItem } from '@/types/database.types'
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
  const [games, setGames] = useState<Game[]>([])
  const [newGameName, setNewGameName] = useState('')
  const [addingGame, setAddingGame] = useState(false)
  const [libraryGames, setLibraryGames] = useState<GameLibraryItem[]>([])
  const [gameInstallRequests, setGameInstallRequests] = useState<any[]>([])
  const [seatReservations, setSeatReservations] = useState<{ id: string, seat_id: string, guest_id: string, guest_name: string }[]>([])

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

      // Fetch games for this session
      const gamesRes = await fetch(`/api/admin/sessions/${sessionId}/games`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (gamesRes.ok) {
        const data = await gamesRes.json()
        setGames(data.games || [])
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

      // Fetch global game library
      const libraryRes = await fetch('/api/admin/games', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (libraryRes.ok) {
        const data = await libraryRes.json()
        setLibraryGames((data.games || []).filter((g: GameLibraryItem) => g.is_available))
      }

      // Fetch game install requests
      const installRes = await fetch(`/api/game-installs?session_id=${sessionId}`)
      if (installRes.ok) {
        const installData = await installRes.json()
        setGameInstallRequests(installData.requests || [])
      }

      // Fetch seat reservations for this session
      const seatsRes = await fetch(`/api/seats/reservations?session_id=${sessionId}`)
      if (seatsRes.ok) {
        const seatsData = await seatsRes.json()
        setSeatReservations(seatsData.reservations || [])
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

  const addGame = async () => {
    if (!newGameName.trim()) return
    try {
      setAddingGame(true)
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/sessions/${sessionId}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newGameName.trim() }),
      })
      if (res.ok) {
        setNewGameName('')
        await fetchEventData()
      }
    } catch (error) {
      console.error('Error adding game:', error)
    } finally {
      setAddingGame(false)
    }
  }

  const deleteGame = async (gameId: string) => {
    if (!confirm('Smazat tuto hru?')) return
    try {
      const token = localStorage.getItem('admin_token')
      await fetch(`/api/admin/sessions/${sessionId}/games?gameId=${gameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      await fetchEventData()
    } catch (error) {
      console.error('Error deleting game:', error)
    }
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jméno</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Místo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Noci</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Příjezd / Odjezd</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HW</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HW (Kč)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jídlo (Kč)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase text-red-600 font-bold">Celkem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {guests.length > 0 ? (
                  guests.map((guest) => {
                    const hwPrice = getTotalHardwareByGuest(guest.id)
                    const foodPrice = getTotalConsumptionByGuest(guest.id)
                    const totalPrice = getTotalPriceByGuest(guest.id)
                    const guestHw = getGuestHardware(guest.id)
                    return (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{guest.name}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const seats = seatReservations.filter(r => r.guest_id === guest.id).map(r => r.seat_id)
                            return seats.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {seats.map(s => (
                                  <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-semibold whitespace-nowrap">
                                    🪑 {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-semibold text-xs">
                            {guest.nights_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {guest.check_in_date ? formatDateOnly(new Date(guest.check_in_date)) : '—'}
                          {' → '}
                          {guest.check_out_date ? formatDateOnly(new Date(guest.check_out_date)) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {guestHw.length > 0 ? guestHw.map((hw, i) => (
                              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                {hw.quantity > 1 ? `${hw.quantity}× ` : ''}{hw.name}
                              </span>
                            )) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{hwPrice} Kč</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{foodPrice} Kč</td>
                        <td className="px-4 py-3 font-bold text-red-600">{totalPrice} Kč</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Zatím žádní hosté
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hardware Reservations - grouped by guest */}
        {reservations.length > 0 && (() => {
          // Group reservations by guest
          const guestHwMap: Record<string, { name: string; items: { name: string; type: string; qty: number; nights: number; price: number }[] }> = {}
          reservations.forEach(r => {
            const gid = r.guest_id
            if (!guestHwMap[gid]) {
              guestHwMap[gid] = { name: getGuestName(gid), items: [] }
            }
            const hw = hardwareItems.find(h => h.id === r.hardware_item_id)
            guestHwMap[gid].items.push({
              name: hw?.name || 'Neznámý HW',
              type: hw?.type || 'accessory',
              qty: r.quantity || 1,
              nights: r.nights_count || 1,
              price: r.total_price || 0,
            })
          })
          const typeOrder: Record<string, number> = { pc: 0, monitor: 1, accessory: 2 }
          // Sort items within each guest: PC → Monitor → Accessory
          Object.values(guestHwMap).forEach(g => {
            g.items.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9))
          })
          const sortedGuests = Object.values(guestHwMap).sort((a, b) => a.name.localeCompare(b.name))

          return (
            <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">💻 HW Rezervace ({reservations.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {sortedGuests.map((guest, idx) => {
                  const guestTotal = guest.items.reduce((s, i) => s + i.price, 0)
                  return (
                    <div key={idx} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                      <span className="font-semibold text-gray-900 w-36 flex-shrink-0 truncate">{guest.name}</span>
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {guest.items.map((item, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${item.type === 'monitor'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : item.type === 'pc'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                          >
                            {item.type === 'monitor' ? '📺' : item.type === 'pc' ? '💻' : '🎮'}
                            {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                          </span>
                        ))}
                      </div>
                      <span className="flex-shrink-0 font-bold text-gray-900 text-sm">{guestTotal} Kč</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}



        {/* Game Install Requests for Admin Overview */}
        {gameInstallRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">💿 Hry k instalaci na PC</h2>
              <p className="text-sm text-gray-500 mt-1">Přehled her, které si hosté přejí nainstalovat na svůj PC</p>
            </div>
            <div className="divide-y divide-gray-100">
              {gameInstallRequests.map((req: any) => {
                const guestName = getGuestName(req.guest_id)
                // Find which PCs this guest has reserved
                const guestPcReservations = reservations.filter(
                  (r: any) => r.guest_id === req.guest_id && hardwareItems.find(h => h.id === r.hardware_item_id)?.type === 'pc'
                )
                const pcNames = guestPcReservations.map((r: any) => {
                  const hw = hardwareItems.find(h => h.id === r.hardware_item_id)
                  return hw?.name || 'PC'
                })

                return (
                  <div key={req.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      {/* Guest info */}
                      <div className="flex-shrink-0">
                        <span className="font-semibold text-gray-900">{guestName}</span>
                        {pcNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pcNames.map((name: string, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                💻 {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Games */}
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {(req.game_names || []).map((gameName: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200"
                          >
                            🎮 {gameName}
                          </span>
                        ))}
                      </div>
                      {/* Game count */}
                      <span className="flex-shrink-0 text-xs font-semibold bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                        {(req.game_names || []).length} her
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Summary footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                📊 Celkem {gameInstallRequests.length} hostů si vyžádalo instalaci her •{' '}
                {[...new Set(gameInstallRequests.flatMap((r: any) => r.game_names || []))].length} unikátních her
              </p>
            </div>
          </div>
        )}

        {/* Meal Attendance per Day */}
        {(() => {
          const days = getMenuDays()
          if (days.length === 0 || guests.length === 0) return null

          // Calculate which guests are present on a given day
          const getGuestsOnDay = (dayDate: Date) => {
            return guests.filter(g => {
              if (g.check_in_date && g.check_out_date) {
                const checkIn = new Date(g.check_in_date)
                const checkOut = new Date(g.check_out_date)
                checkIn.setHours(0, 0, 0, 0)
                checkOut.setHours(23, 59, 59, 999)
                const d = new Date(dayDate)
                d.setHours(12, 0, 0, 0)
                return d >= checkIn && d <= checkOut
              }
              // If no dates, assume present all days
              return true
            })
          }

          const mealTypes: MealType[] = ['lunch', 'dinner']

          return (
            <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">🍽️ Stravování – přehled po dnech</h2>
                <Link
                  href={`/admin/sessions/${sessionId}/menu`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Upravit jídelníček →
                </Link>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {days.map(day => {
                    const presentGuests = getGuestsOnDay(day.date)
                    const dayMeals = getMealsForDay(day.dayIndex)
                    return (
                      <div key={day.dayIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Day header */}
                        <div className="px-4 py-2.5 bg-gray-800 text-white flex items-center justify-between">
                          <span className="font-semibold text-sm">📅 {day.label}</span>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                            {presentGuests.length} hostů
                          </span>
                        </div>

                        {/* Meals */}
                        <div className="divide-y divide-gray-100">
                          {mealTypes.map(mealType => {
                            const mealInfo = dayMeals.find(m => m.meal_type === mealType)
                            const label = getMealTypeLabel(mealType)
                            return (
                              <div key={mealType} className="px-4 py-2.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{label}</span>
                                    {mealInfo?.time && (
                                      <span className="text-xs text-gray-400">{mealInfo.time}</span>
                                    )}
                                  </div>
                                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    {presentGuests.length} porcí
                                  </span>
                                </div>
                                {mealInfo?.description && (
                                  <p className="text-xs text-gray-600 mb-1.5 italic">{mealInfo.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {presentGuests.map(g => (
                                    <span key={g.id} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                      {g.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
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
          )
        })()}

        {/* Consumption History - grouped by guest */}
        {consumption.length > 0 && (() => {
          const guestConsMap: Record<string, { name: string; items: Record<string, { qty: number; price: number }>; total: number }> = {}
          consumption.forEach(rec => {
            const gid = rec.guest_id
            if (!guestConsMap[gid]) {
              guestConsMap[gid] = { name: getGuestName(gid), items: {}, total: 0 }
            }
            const price = rec.products?.price || 0
            const subtotal = rec.quantity * price
            const productName = rec.products?.name || 'Neznámý'
            if (!guestConsMap[gid].items[productName]) {
              guestConsMap[gid].items[productName] = { qty: 0, price: 0 }
            }
            guestConsMap[gid].items[productName].qty += rec.quantity
            guestConsMap[gid].items[productName].price += subtotal
            guestConsMap[gid].total += subtotal
          })
          const sorted = Object.values(guestConsMap)
            .map(g => ({ ...g, itemList: Object.entries(g.items).map(([product, v]) => ({ product, ...v })) }))
            .sort((a, b) => a.name.localeCompare(b.name))

          return (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">🍕 Nákupy – Spotřeba ({consumption.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {sorted.map((guest, idx) => (
                  <div key={idx} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                    <span className="font-semibold text-gray-900 w-36 flex-shrink-0 truncate">{guest.name}</span>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {guest.itemList.map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {item.qty > 1 ? `${item.qty}× ` : ''}{item.product}
                          <span className="text-amber-500 font-normal">({item.price} Kč)</span>
                        </span>
                      ))}
                    </div>
                    <span className="flex-shrink-0 font-bold text-gray-900 text-sm">{guest.total} Kč</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}