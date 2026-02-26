'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Monitor, Utensils, TrendingUp, Loader2, Edit2, Check, X, Edit, UtensilsCrossed, Heart, Cpu, ChevronDown, ChevronUp, CheckCircle2, Circle, Trophy } from 'lucide-react'
import { Session, Guest, MenuItem, MealType, Game, GameLibraryItem, HardwareOverride, Product } from '@/types/database.types'
import { HardwareItem } from '@/types/hardware.types'
import { formatDate, formatDateOnly } from '@/lib/utils'
import { useAdminAuth } from '@/lib/admin-auth-context'
import { canViewFinances, canEditSettings, canEditPrices } from '@/lib/admin-roles'

interface HardwareReservation {
  id: string
  guest_id: string
  hardware_item_id: string
  quantity: number
  nights_count: number
  total_price: number
  created_at: string
}

interface AdminHardwareItemDetail {
  id: string
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity: number
  is_available: boolean
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
  const { role } = useAdminAuth()
  const showFinances = role ? canViewFinances(role) : false
  const showEdit = role ? canEditSettings(role) : false
  const showPrices = role ? canEditPrices(role) : false

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
  const [editEventStartTime, setEditEventStartTime] = useState('')
  const [editEventEndTime, setEditEventEndTime] = useState('')
  const [editEventDescription, setEditEventDescription] = useState('')
  const [editPricePerNight, setEditPricePerNight] = useState('')
  const [editSurchargeEnabled, setEditSurchargeEnabled] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  // Hardware edit state
  const [editHwPricingEnabled, setEditHwPricingEnabled] = useState(true)
  const [editHwEnabled, setEditHwEnabled] = useState(true)
  const [editSeatsEnabled, setEditSeatsEnabled] = useState(true)
  const [editHwOverrides, setEditHwOverrides] = useState<Record<string, HardwareOverride>>({})
  const [allHardwareItemsForEdit, setAllHardwareItemsForEdit] = useState<AdminHardwareItemDetail[]>([])
  const [showHwConfigEdit, setShowHwConfigEdit] = useState(false)
  // Top products state
  const [editTopProducts, setEditTopProducts] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuEnabled, setMenuEnabled] = useState(false)
  const [guestSelections, setGuestSelections] = useState<Record<string, any>>({})
  const [games, setGames] = useState<Game[]>([])
  const [newGameName, setNewGameName] = useState('')
  const [addingGame, setAddingGame] = useState(false)
  const [libraryGames, setLibraryGames] = useState<GameLibraryItem[]>([])
  const [gameInstallRequests, setGameInstallRequests] = useState<any[]>([])
  const [seatReservations, setSeatReservations] = useState<{ id: string, seat_id: string, guest_id: string, guest_name: string }[]>([])
  const [tips, setTips] = useState<Record<string, { amount: number; percentage: number | null }>>({})
  const [hwPrepared, setHwPrepared] = useState<Record<string, string>>({})
  const [gamesPrepared, setGamesPrepared] = useState<Record<string, string>>({})

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
    if (session && searchParams.get('edit') === 'true' && showEdit) {
      startEditEvent(session)
    }
  }, [session, searchParams, showEdit])

  const startEditEvent = (sessionToEdit: ExtendedSession) => {
    setEditingEvent(true)
    setEditEventName(sessionToEdit.name)
    const startDate = sessionToEdit.start_date ? formatDateTimeLocal(new Date(sessionToEdit.start_date)) : ''
    const endDate = sessionToEdit.end_date ? formatDateTimeLocal(new Date(sessionToEdit.end_date)) : ''
    setEditEventStartDate(startDate)
    setEditEventEndDate(endDate)
    setEditEventStartTime((sessionToEdit as any).start_time || '')
    setEditEventEndTime((sessionToEdit as any).end_time || '')
    setEditEventDescription(sessionToEdit.description || '')
    setEditPricePerNight((sessionToEdit.price_per_night || 0).toString())
    setEditSurchargeEnabled((sessionToEdit as any).surcharge_enabled || false)
    // Load HW settings
    setEditHwPricingEnabled(sessionToEdit.hardware_pricing_enabled !== false)
    setEditHwEnabled((sessionToEdit as any).hardware_enabled !== false)
    setEditSeatsEnabled((sessionToEdit as any).seats_enabled !== false)
    setEditHwOverrides(sessionToEdit.hardware_overrides || {})
    setShowHwConfigEdit(false)
    setEditTopProducts((sessionToEdit as any).top_products || [])
    // Fetch HW items for override UI
    fetchHardwareItemsForEdit()
    fetchAllProducts()
  }

  const fetchHardwareItemsForEdit = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/hardware', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAllHardwareItemsForEdit(data.items || [])
      }
    } catch (e) {
      console.error('Error fetching HW items for edit:', e)
    }
  }

  const fetchAllProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setAllProducts(data.products || [])
      }
    } catch (e) {
      console.error('Error fetching products:', e)
    }
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

      // Time settings
      eventData.start_time = editEventStartTime || null
      eventData.end_time = editEventEndTime || null

      // Price settings
      const priceVal = parseFloat(editPricePerNight)
      eventData.price_per_night = !isNaN(priceVal) && priceVal >= 0 ? priceVal : 0
      eventData.surcharge_enabled = editSurchargeEnabled

      // Hardware settings
      eventData.hardware_pricing_enabled = editHwPricingEnabled
      eventData.hardware_enabled = editHwEnabled
      eventData.seats_enabled = editSeatsEnabled
      eventData.hardware_overrides = editHwOverrides
      eventData.top_products = editTopProducts

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
    setEditEventStartTime('')
    setEditEventEndTime('')
    setEditEventDescription('')
    setEditPricePerNight('')
    setEditSurchargeEnabled(false)
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

      // Fetch prepared state
      const preparedRes = await fetch(`/api/admin/sessions/${sessionId}/prepared`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (preparedRes.ok) {
        const preparedData = await preparedRes.json()
        setHwPrepared(preparedData.hw_prepared || {})
        setGamesPrepared(preparedData.games_prepared || {})
      }

      // Fetch tips for this session (use session slug from state or just-fetched data)
      const tipSlug = session?.slug || sessionId
      const tipsRes = await fetch(`/api/event/${tipSlug}/tips`)
      if (tipsRes.ok) {
        const tipsData = await tipsRes.json()
        setTips(tipsData.tips || {})
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

  const getTipByGuest = (guestId: string) => {
    return tips[guestId]?.amount || 0
  }

  const getTotalPriceByGuest = (guestId: string) => {
    const nights = getGuestNights(guestId)
    const nightsPrice = nights * (session?.price_per_night || 0)
    const hardwarePrice = getTotalHardwareByGuest(guestId)
    const foodPrice = getTotalConsumptionByGuest(guestId)
    const tip = getTipByGuest(guestId)
    return nightsPrice + hardwarePrice + foodPrice + tip
  }

  const getTotalRevenue = () => {
    let total = 0
    // Add nights revenue
    total += guests.reduce((sum, g) => sum + (g.nights_count * (session?.price_per_night || 0)), 0)
    // Add hardware revenue
    total += reservations.reduce((sum, r) => sum + r.total_price, 0)
    // Add consumption revenue
    total += consumption.reduce((sum, c) => sum + (c.quantity * (c.products?.price || 0)), 0)
    // Add tips
    total += Object.values(tips).reduce((sum, t) => sum + (t.amount || 0), 0)
    return total
  }

  const getTotalTips = () => {
    return Object.values(tips).reduce((sum, t) => sum + (t.amount || 0), 0)
  }

  const togglePrepared = async (guestId: string, type: 'hw' | 'games') => {
    const current = type === 'hw' ? hwPrepared : gamesPrepared
    const isPrepared = !!current[guestId]
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/sessions/${sessionId}/prepared`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ guest_id: guestId, type, prepared: !isPrepared }),
      })
      if (res.ok) {
        const data = await res.json()
        setHwPrepared(data.hw_prepared || {})
        setGamesPrepared(data.games_prepared || {})
      }
    } catch (e) {
      console.error('Error toggling prepared state:', e)
    }
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
                href={`/admin/sessions/${sessionId}/seatmap`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
              >
                🗺️ Mapa míst
              </Link>
              {showFinances && (
                <Link
                  href={`/admin/sessions/${sessionId}/settlement`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  💳 Vyúčtování
                </Link>
              )}
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
      {editingEvent && showEdit && (
        <div style={{ backgroundColor: 'var(--nest-surface)', borderBottom: '1px solid var(--nest-border)' }} className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--nest-text-primary)' }}>
              <Edit className="w-5 h-5" />
              Upravit event
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                  Název eventu *
                </label>
                <input
                  type="text"
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  placeholder="např. LAN Party - Listopad 2025"
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                    Datum začátku
                  </label>
                  <input
                    type="date"
                    value={editEventStartDate}
                    onChange={(e) => setEditEventStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                    Datum konce
                  </label>
                  <input
                    type="date"
                    value={editEventEndDate || ''}
                    onChange={(e) => setEditEventEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                    Čas začátku
                  </label>
                  <input
                    type="time"
                    value={editEventStartTime}
                    onChange={(e) => setEditEventStartTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                    Čas konce
                  </label>
                  <input
                    type="time"
                    value={editEventEndTime}
                    onChange={(e) => setEditEventEndTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                  Popis eventu
                </label>
                <textarea
                  value={editEventDescription}
                  onChange={(e) => setEditEventDescription(e.target.value)}
                  placeholder="Popis eventu..."
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                  Cena za noc (Kč)
                </label>
                <input
                  type="number"
                  value={editPricePerNight}
                  onChange={(e) => setEditPricePerNight(e.target.value)}
                  placeholder="např. 300"
                  min="0"
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                />
              </div>

              {/* Surcharge toggle */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={editSurchargeEnabled}
                      onChange={(e) => setEditSurchargeEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="block w-12 h-7 rounded-full transition-colors"
                      style={{ backgroundColor: editSurchargeEnabled ? '#f59e0b' : 'var(--nest-border)' }}
                    ></div>
                    <div
                      className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full transition-transform ${editSurchargeEnabled ? 'translate-x-5' : ''}`}
                      style={{ backgroundColor: 'var(--nest-text-primary)' }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Příplatek pod 10 lidí</span>
                  </div>
                </label>
                {editSurchargeEnabled && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
                  >
                    +150 Kč/noc za každého chybějícího
                  </span>
                )}
              </div>

              {editSurchargeEnabled && (
                <div
                  className="rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                  }}
                >
                  💡 Při méně než 10 účastnících se cena za noc zvýší o 150 Kč za každého chybějícího.
                  Např. při 7 lidech: {editPricePerNight ? `${parseInt(editPricePerNight) + 3 * 150} Kč` : '—'} /noc.
                </div>
              )}

              {/* Hardware Configuration */}
              <hr style={{ borderColor: 'var(--nest-border)' }} />

              {/* Guest sections toggles */}
              <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nest-text-primary)' }}>
                🎛️ Sekce pro hosty
              </h4>

              <div className="flex flex-col gap-3">
                {/* Hardware enabled toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editHwEnabled}
                        onChange={(e) => setEditHwEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className="block w-12 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: editHwEnabled ? '#3b82f6' : 'var(--nest-border)' }}
                      ></div>
                      <div
                        className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full transition-transform ${editHwEnabled ? 'translate-x-5' : ''}`}
                        style={{ backgroundColor: 'var(--nest-text-primary)' }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5" style={{ color: '#60a5fa' }} />
                      <span className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Rezervace techniky</span>
                    </div>
                  </label>
                  {!editHwEnabled && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' }}>
                      🚫 Vypnuto
                    </span>
                  )}
                </div>

                {/* Seats enabled toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editSeatsEnabled}
                        onChange={(e) => setEditSeatsEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className="block w-12 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: editSeatsEnabled ? '#22c55e' : 'var(--nest-border)' }}
                      ></div>
                      <div
                        className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full transition-transform ${editSeatsEnabled ? 'translate-x-5' : ''}`}
                        style={{ backgroundColor: 'var(--nest-text-primary)' }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.2rem' }}>💺</span>
                      <span className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Rezervace míst k sezení</span>
                    </div>
                  </label>
                  {!editSeatsEnabled && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' }}>
                      🚫 Vypnuto
                    </span>
                  )}
                </div>
              </div>

              {/* TOP Products Challenge */}
              <hr style={{ borderColor: 'var(--nest-border)' }} />

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nest-text-primary)' }}>
                  <Trophy className="w-5 h-5" style={{ color: '#f59e0b' }} />
                  TOP Challenge
                  {editTopProducts.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      {editTopProducts.length} {editTopProducts.length === 1 ? 'položka' : editTopProducts.length < 5 ? 'položky' : 'položek'}
                    </span>
                  )}
                </h4>
                <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                  Vyber produkty, u kterých se bude zobrazovat TOP žebříček spotřeby na stránce občerstvení.
                </p>

                {allProducts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allProducts.map(product => {
                      const isSelected = editTopProducts.includes(product.id)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditTopProducts(editTopProducts.filter(id => id !== product.id))
                            } else {
                              setEditTopProducts([...editTopProducts, product.id])
                            }
                          }}
                          className="px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
                          style={{
                            backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'var(--nest-bg)',
                            borderColor: isSelected ? '#f59e0b' : 'var(--nest-border)',
                            color: isSelected ? '#f59e0b' : 'var(--nest-text-secondary)',
                          }}
                        >
                          {isSelected ? '🏆 ' : ''}{product.name}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--nest-text-tertiary)' }}>Načítám produkty...</p>
                )}
              </div>

              <hr style={{ borderColor: 'var(--nest-border)' }} />

              <div className="space-y-4">
                {/* HW pricing toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editHwPricingEnabled}
                        onChange={(e) => setEditHwPricingEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className="block w-12 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: editHwPricingEnabled ? '#3b82f6' : 'var(--nest-border)' }}
                      ></div>
                      <div
                        className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full transition-transform ${editHwPricingEnabled ? 'translate-x-5' : ''}`}
                        style={{ backgroundColor: 'var(--nest-text-primary)' }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5" style={{ color: '#60a5fa' }} />
                      <span className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Cena techniky</span>
                    </div>
                  </label>
                  {!editHwPricingEnabled && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }}>
                      🚫 Cena techniky nebude zobrazena hostům
                    </span>
                  )}
                </div>

                {!editHwPricingEnabled && (
                  <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)', color: '#fbbf24' }}>
                    💡 Hostům nebudou vidět ceny za hardware. Technika se jim nebude počítat do nákladů.
                  </div>
                )}

                {/* HW overrides */}
                <div>
                  <button
                    onClick={() => setShowHwConfigEdit(!showHwConfigEdit)}
                    className="flex items-center gap-2 font-medium text-sm transition-colors"
                    style={{ color: '#60a5fa' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#93bbfd')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                  >
                    <Cpu className="w-4 h-4" />
                    {showHwConfigEdit ? 'Skrýt úpravy HW' : '🖥️ Upravit dostupnost HW pro tuto akci'}
                    {showHwConfigEdit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {Object.keys(editHwOverrides).length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#93bbfd' }}>
                        {Object.keys(editHwOverrides).length} změn
                      </span>
                    )}
                  </button>
                </div>

                {showHwConfigEdit && (
                  <div className="rounded-lg p-4 space-y-3" style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nest-text-primary)' }}>
                        🖥️ Úpravy dostupnosti HW
                        <span className="text-sm font-normal" style={{ color: 'var(--nest-text-secondary)' }}>(změň počet kusů pro tuto akci)</span>
                      </h4>
                      {Object.keys(editHwOverrides).length > 0 && (
                        <button onClick={() => setEditHwOverrides({})} className="text-xs font-medium underline" style={{ color: '#f87171' }}>
                          Resetovat vše
                        </button>
                      )}
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--nest-text-secondary)' }}>
                      ⚠️ Nastav 0 pro úplné skrytí dané položky. Pokud pole nevyplníš, použije se výchozí počet.
                    </p>

                    {(() => {
                      const grouped: Record<string, AdminHardwareItemDetail[]> = {}
                      allHardwareItemsForEdit.filter(i => i.is_available).forEach(item => {
                        const label = item.type === 'monitor' ? '📺 Monitory' : item.type === 'pc' ? '💻 Počítače' : '🎮 Příslušenství'
                        if (!grouped[label]) grouped[label] = []
                        grouped[label].push(item)
                      })
                      return Object.entries(grouped).map(([groupLabel, items]) => (
                        <div key={groupLabel}>
                          <h5 className="text-sm font-semibold mb-2" style={{ color: 'var(--nest-text-primary)' }}>{groupLabel}</h5>
                          <div className="space-y-2">
                            {items.map(item => {
                              const hasOverride = editHwOverrides[item.id] !== undefined
                              const overrideQty = hasOverride ? editHwOverrides[item.id].quantity : null
                              const isReduced = hasOverride && overrideQty !== null && overrideQty < item.quantity
                              const isDisabled = hasOverride && overrideQty === 0
                              return (
                                <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors" style={{
                                  backgroundColor: isDisabled ? 'rgba(239, 68, 68, 0.1)' : isReduced ? 'rgba(251, 191, 36, 0.1)' : 'var(--nest-surface)',
                                  border: `1px solid ${isDisabled ? 'rgba(239, 68, 68, 0.3)' : isReduced ? 'rgba(251, 191, 36, 0.3)' : 'var(--nest-border)'}`,
                                }}>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-medium ${isDisabled ? 'line-through' : ''}`} style={{ color: isDisabled ? '#f87171' : 'var(--nest-text-primary)' }}>
                                      {item.name}
                                    </span>
                                    <span className="text-xs ml-2" style={{ color: 'var(--nest-text-tertiary)' }}>
                                      (výchozí: {item.quantity} ks • {item.price_per_night} Kč/noc)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <input
                                      type="number"
                                      value={overrideQty !== null ? overrideQty : ''}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        if (val === '' || val === undefined) {
                                          const copy = { ...editHwOverrides }
                                          delete copy[item.id]
                                          setEditHwOverrides(copy)
                                        } else {
                                          const num = Math.max(0, Math.min(parseInt(val) || 0, item.quantity))
                                          setEditHwOverrides({ ...editHwOverrides, [item.id]: { quantity: num } })
                                        }
                                      }}
                                      placeholder={`${item.quantity}`}
                                      min="0"
                                      max={item.quantity}
                                      className="w-20 px-2 py-1 rounded-lg text-sm text-center font-medium"
                                      style={{
                                        backgroundColor: 'var(--nest-bg)',
                                        border: `1px solid ${isDisabled ? 'rgba(239, 68, 68, 0.4)' : isReduced ? 'rgba(251, 191, 36, 0.4)' : 'var(--nest-border)'}`,
                                        color: isDisabled ? '#f87171' : isReduced ? '#fbbf24' : 'var(--nest-text-primary)',
                                      }}
                                    />
                                    <span className="text-xs w-6" style={{ color: 'var(--nest-text-tertiary)' }}>ks</span>
                                    {hasOverride && (
                                      <button
                                        onClick={() => { const copy = { ...editHwOverrides }; delete copy[item.id]; setEditHwOverrides(copy) }}
                                        className="transition-colors"
                                        style={{ color: 'var(--nest-text-tertiary)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nest-text-tertiary)')}
                                        title="Zrušit úpravu"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={cancelEditEvent}
                  disabled={savingEvent}
                  className="px-6 py-2 rounded-lg transition-colors"
                  style={{ border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)', backgroundColor: 'var(--nest-bg)' }}
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

          {/* Price Per Night - Admin only */}
          {showFinances && (
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
          )}

          {/* Revenue - Admin only */}
          {showFinances && (
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Celkový obrat</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalRevenue} Kč</p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
            </div>
          )}
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
                  {showFinances && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HW (Kč)</th>}
                  {showFinances && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jídlo (Kč)</th>}
                  {showFinances && <th className="px-4 py-3 text-left text-xs font-medium text-pink-500 uppercase">💖 Dýško</th>}
                  {showFinances && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase text-red-600 font-bold">Celkem</th>}
                  {showFinances && <th className="px-4 py-3 text-left text-xs font-medium text-emerald-600 uppercase">💰 Záloha</th>}
                  {showFinances && <th className="px-4 py-3 text-left text-xs font-medium text-orange-600 uppercase">Zbývá</th>}
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
                                  <span key={s} className="text-[11px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap" style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
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
                          <span className="px-2.5 py-0.5 rounded-full font-semibold text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
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
                              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                                {hw.quantity > 1 ? `${hw.quantity}× ` : ''}{hw.name}
                              </span>
                            )) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        {showFinances && <td className="px-4 py-3 text-sm font-medium text-gray-900">{hwPrice} Kč</td>}
                        {showFinances && <td className="px-4 py-3 text-sm font-medium text-gray-900">{foodPrice} Kč</td>}
                        {showFinances && (
                          <td className="px-4 py-3 text-sm font-medium">
                            {getTipByGuest(guest.id) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-pink-600 font-semibold">
                                <Heart className="w-3.5 h-3.5 fill-pink-500" />
                                {getTipByGuest(guest.id)} Kč
                                {tips[guest.id]?.percentage && (
                                  <span className="text-xs text-pink-400">({tips[guest.id].percentage}%)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        {showFinances && <td className="px-4 py-3 font-bold text-red-600">{totalPrice} Kč</td>}
                        {showFinances && (
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              defaultValue={(guest as any).deposit || 0}
                              onBlur={async (e) => {
                                const val = parseFloat(e.target.value) || 0
                                if (val !== ((guest as any).deposit || 0)) {
                                  try {
                                    const token = localStorage.getItem('admin_token')
                                    await fetch(`/api/admin/sessions/${sessionId}/deposits`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                      body: JSON.stringify({ guest_id: guest.id, deposit: val })
                                    })
                                      ; (guest as any).deposit = val
                                  } catch (err) {
                                    console.error('Error saving deposit:', err)
                                  }
                                }
                              }}
                              className="w-20 px-2 py-1 rounded text-sm text-center font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                          </td>
                        )}
                        {showFinances && (
                          <td className="px-4 py-3 font-bold">
                            {(() => {
                              const remaining = totalPrice - ((guest as any).deposit || 0)
                              return (
                                <span className={remaining <= 0 ? 'text-green-600' : 'text-orange-600'}>
                                  {remaining <= 0 ? '✅ 0' : remaining} Kč
                                </span>
                              )
                            })()}
                          </td>
                        )}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
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
          const guestHwMap: Record<string, { guestId: string; name: string; items: { name: string; type: string; qty: number; nights: number; price: number }[] }> = {}
          reservations.forEach(r => {
            const gid = r.guest_id
            if (!guestHwMap[gid]) {
              guestHwMap[gid] = { guestId: gid, name: getGuestName(gid), items: [] }
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
          const preparedCount = sortedGuests.filter(g => hwPrepared[g.guestId]).length

          return (
            <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">💻 HW Rezervace ({reservations.length})</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${preparedCount === sortedGuests.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {preparedCount}/{sortedGuests.length} nachystáno
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {sortedGuests.map((guest, idx) => {
                  const guestTotal = guest.items.reduce((s, i) => s + i.price, 0)
                  const isPrepared = !!hwPrepared[guest.guestId]
                  return (
                    <div key={idx} className={`px-6 py-3 flex items-center gap-4 hover:bg-gray-50`} style={isPrepared ? { borderLeft: '3px solid #22c55e', backgroundColor: 'rgba(34, 197, 94, 0.04)' } : { borderLeft: '3px solid transparent' }}>
                      <button
                        onClick={() => togglePrepared(guest.guestId, 'hw')}
                        className="flex-shrink-0 transition-colors"
                        title={isPrepared ? 'Označeno jako nachystané — klikni pro zrušení' : 'Označit jako nachystané'}
                      >
                        {isPrepared
                          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                          : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                        }
                      </button>
                      <span className="font-semibold w-36 flex-shrink-0 truncate text-gray-900">{guest.name}</span>
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {guest.items.map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={item.type === 'monitor'
                              ? { backgroundColor: 'rgba(249, 115, 22, 0.12)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.25)' }
                              : item.type === 'pc'
                                ? { backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)' }
                                : { backgroundColor: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)' }}
                          >
                            {item.type === 'monitor' ? '📺' : item.type === 'pc' ? '💻' : '🎮'}
                            {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                          </span>
                        ))}
                      </div>
                      {showFinances && <span className="flex-shrink-0 font-bold text-gray-900 text-sm">{guestTotal} Kč</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}



        {/* Game Install Requests for Admin Overview */}
        {gameInstallRequests.length > 0 && (() => {
          const gamesPreparedCount = gameInstallRequests.filter((req: any) => gamesPrepared[req.guest_id]).length
          return (
            <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">💿 Hry k instalaci na PC</h2>
                  <p className="text-sm text-gray-500 mt-1">Přehled her, které si hosté přejí nainstalovat na svůj PC</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gamesPreparedCount === gameInstallRequests.length ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {gamesPreparedCount}/{gameInstallRequests.length} nachystáno
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {gameInstallRequests.map((req: any) => {
                  const guestName = getGuestName(req.guest_id)
                  const isPrepared = !!gamesPrepared[req.guest_id]
                  // Find which PCs this guest has reserved
                  const guestPcReservations = reservations.filter(
                    (r: any) => r.guest_id === req.guest_id && hardwareItems.find(h => h.id === r.hardware_item_id)?.type === 'pc'
                  )
                  const pcNames = guestPcReservations.map((r: any) => {
                    const hw = hardwareItems.find(h => h.id === r.hardware_item_id)
                    return hw?.name || 'PC'
                  })

                  return (
                    <div key={req.id} className={`px-6 py-4 hover:bg-gray-50`} style={isPrepared ? { borderLeft: '3px solid #22c55e', backgroundColor: 'rgba(34, 197, 94, 0.04)' } : { borderLeft: '3px solid transparent' }}>
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => togglePrepared(req.guest_id, 'games')}
                          className="flex-shrink-0 mt-0.5 transition-colors"
                          title={isPrepared ? 'Označeno jako nachystané — klikni pro zrušení' : 'Označit jako nachystané'}
                        >
                          {isPrepared
                            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                            : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                          }
                        </button>
                        {/* Guest info */}
                        <div className="flex-shrink-0">
                          <span className="font-semibold text-gray-900">{guestName}</span>
                          {pcNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {pcNames.map((name: string, i: number) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.25)' }}
                            >
                              🎮 {gameName}
                            </span>
                          ))}
                        </div>
                        {/* Game count */}
                        <span className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}>
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
          )
        })()}

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
                    // Only show meal types that actually exist in menu for this day
                    const dayMealTypes = (['breakfast', 'lunch', 'dinner'] as MealType[]).filter(
                      type => dayMeals.some(m => m.meal_type === type)
                    )
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
                          {dayMealTypes.map(mealType => {
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
                                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                                    {presentGuests.length} porcí
                                  </span>
                                </div>
                                {mealInfo?.description && (
                                  <p className="text-xs text-gray-600 mb-1.5 italic">{mealInfo.description}</p>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {presentGuests.map(g => (
                                    <span key={g.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}>
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
                  <div style={{ borderTop: '1px solid var(--nest-border)', paddingTop: '1rem' }}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--nest-text-primary)' }}>
                      ⚠️ Stravovací omezení hostů
                      <span className="text-sm font-normal px-2 py-0.5 rounded-full" style={{ color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                        {getGuestsDietaryInfo().length} hostů
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {getGuestsDietaryInfo().map(guest => (
                        <div key={guest.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <span className="font-semibold w-32 flex-shrink-0" style={{ color: 'var(--nest-text-primary)' }}>{guest.name}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {guest.dietary_restrictions?.map((r: string) => (
                              <span key={r} className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
                                {r === 'vegan' ? '🌱 Vegan' : r === 'vegetarian' ? '🥬 Vegetarián' : r === 'gluten-free' ? '🌾 Bez lepku' : r === 'lactose-free' ? '🥛 Bez laktózy' : r}
                              </span>
                            ))}
                            {guest.dietary_note && (
                              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
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
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                          {item.qty > 1 ? `${item.qty}× ` : ''}{item.product}
                          {showFinances && <span style={{ color: 'rgba(251, 191, 36, 0.6)' }} className="font-normal">({item.price} Kč)</span>}
                        </span>
                      ))}
                    </div>
                    {showFinances && <span className="flex-shrink-0 font-bold text-gray-900 text-sm">{guest.total} Kč</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* TOP Consumption per Product */}
        {consumption.length > 0 && (() => {
          // Build per-product-per-guest consumption map
          const productGuestMap: Record<string, Record<string, { name: string; qty: number }>> = {}
          consumption.forEach(rec => {
            const productName = (rec as any).products?.name || 'Neznámý'
            const gid = rec.guest_id
            if (!productGuestMap[productName]) productGuestMap[productName] = {}
            if (!productGuestMap[productName][gid]) {
              productGuestMap[productName][gid] = { name: getGuestName(gid), qty: 0 }
            }
            productGuestMap[productName][gid].qty += rec.quantity
          })

          // Find the winner for each product (only if more than 1 consumed)
          const tops: { product: string; winner: string; count: number }[] = []
          Object.entries(productGuestMap).forEach(([product, guests]) => {
            const sorted = Object.values(guests).sort((a, b) => b.qty - a.qty)
            if (sorted.length > 0 && sorted[0].qty > 1) {
              tops.push({ product, winner: sorted[0].name, count: sorted[0].qty })
            }
          })
          tops.sort((a, b) => b.count - a.count)

          if (tops.length === 0) return null

          return (
            <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">🏆 TOP Konzumenti</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tops.map((top, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(107, 114, 128, 0.06)', border: `1px solid ${idx === 0 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(107, 114, 128, 0.12)'}` }}>
                      <span className="text-2xl flex-shrink-0">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-400 truncate">{top.product}</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{top.winner}</p>
                        <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{top.count}×</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}