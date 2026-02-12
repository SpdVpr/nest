'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Monitor, Cpu, Check, Gamepad2, Keyboard, Mouse, Headphones, Cable, Edit2, Trash2, X, Save, Plus, Minus } from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { HardwareItem } from '@/types/hardware.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'
import GuestSelectionModal from '@/components/GuestSelectionModal'

// Helper function to get icon based on item name
const getItemIcon = (item: { name: string; type: string }, className: string = "w-5 h-5") => {
  const name = item.name.toLowerCase()

  if (item.type === 'pc') {
    return <Cpu className={className} />
  } else if (item.type === 'monitor') {
    return <Monitor className={className} />
  } else if (item.type === 'accessory') {
    if (name.includes('klávesnic')) {
      return <Keyboard className={className} />
    } else if (name.includes('myš')) {
      return <Mouse className={className} />
    } else if (name.includes('sluchátk')) {
      return <Headphones className={className} />
    } else if (name.includes('kabel') || name.includes('napájec')) {
      return <Cable className={className} />
    } else {
      return <Gamepad2 className={className} />
    }
  }

  return <Gamepad2 className={className} />
}

const formatSpecs = (specs?: { diagonal?: string; hz?: string; resolution?: string; cpu?: string; gpu?: string; ram?: string }): string => {
  if (!specs) return ''
  const parts: string[] = []
  if (specs.diagonal) parts.push(`${specs.diagonal}${specs.diagonal.includes('"') || specs.diagonal.includes('″') ? '' : '"'}`)
  if (specs.hz) parts.push(`${specs.hz}${specs.hz.toLowerCase().includes('hz') ? '' : ' Hz'}`)
  if (specs.resolution) parts.push(`${specs.resolution}`)
  if (specs.cpu) parts.push(`CPU: ${specs.cpu}`)
  if (specs.ram) parts.push(`RAM: ${specs.ram}`)
  if (specs.gpu) parts.push(`GPU: ${specs.gpu}`)
  return parts.join(' • ')
}

export default function EventHardwarePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  // Quantity selection: itemId -> quantity wanted
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [nightsCount, setNightsCount] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showGuestSelection, setShowGuestSelection] = useState(false)
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null)
  const [editNightsCount, setEditNightsCount] = useState<number>(1)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (slug) {
      fetchData()
    }
  }, [slug])

  useEffect(() => {
    if (mounted && guests.length > 0) {
      const currentGuest = guestStorage.getCurrentGuest(slug)
      if (currentGuest) {
        const guestToSelect = guests.find(g => g.id === currentGuest.id)
        if (guestToSelect) {
          setSelectedGuest(guestToSelect)
          setNightsCount(guestToSelect.nights_count || 1)
        }
      } else {
        setShowGuestSelection(true)
      }
    }
  }, [guests, slug, mounted])

  const fetchData = async () => {
    try {
      setLoading(true)

      const sessionRes = await fetch(`/api/event/${slug}`)
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData.session)

        const reservationsRes = await fetch(`/api/hardware/reservations?session_id=${sessionData.session.id}`)
        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json()
          setReservations(reservationsData.reservations || [])
        }
      }

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests)
      }

      const hardwareRes = await fetch('/api/hardware/items')
      if (hardwareRes.ok) {
        const hardwareData = await hardwareRes.json()
        setHardwareItems(hardwareData.items)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Compute available quantity for an item
  const getAvailableQty = (item: HardwareItem): number => {
    const totalStock = item.quantity || 1
    const reservedQty = reservations
      .filter(r => r.hardware_item_id === item.id && r.status !== 'cancelled')
      .reduce((sum: number, r: any) => sum + (r.quantity || 1), 0)
    return Math.max(0, totalStock - reservedQty)
  }

  const changeQuantity = (itemId: string, delta: number, maxAvailable: number) => {
    setSelectedQuantities(prev => {
      const current = prev[itemId] || 0
      const next = Math.max(0, Math.min(current + delta, maxAvailable))
      if (next === 0) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return { ...prev, [itemId]: next }
    })
  }

  const getTotalSelectedCount = () => Object.values(selectedQuantities).reduce((a, b) => a + b, 0)

  const getTotalPrice = () => {
    let total = 0
    for (const [itemId, qty] of Object.entries(selectedQuantities)) {
      const item = hardwareItems.find(i => i.id === itemId)
      if (item) total += item.price_per_night * qty * nightsCount
    }
    return total
  }

  const handleReserve = async () => {
    if (!selectedGuest || !session) return

    const reservationItems = Object.entries(selectedQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ hardware_item_id: itemId, quantity: qty }))

    if (reservationItems.length === 0) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/hardware/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          reservations: reservationItems,
          nights_count: nightsCount,
          session_id: session.id,
        }),
      })

      if (response.ok) {
        setSelectedQuantities({})
        setShowConfirm(false)
        setNightsCount(1)
        fetchData()
        alert('Rezervace byla úspěšně vytvořena!')
      } else {
        const errorData = await response.json()
        alert(`Chyba: ${errorData.error || 'Neznámá chyba'}`)
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert(`Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditReservation = (reservationId: string, currentNights: number) => {
    setEditingReservationId(reservationId)
    setEditNightsCount(currentNights)
  }

  const handleSaveEdit = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/hardware/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nights_count: editNightsCount }),
      })

      if (response.ok) {
        setEditingReservationId(null)
        fetchData()
      } else {
        const errorData = await response.json()
        alert(`Chyba: ${errorData.error || 'Neznámá chyba'}`)
      }
    } catch (error) {
      console.error('Error updating reservation:', error)
    }
  }

  const handleDeleteReservation = async (reservationId: string) => {
    if (!confirm('Opravdu chceš smazat tuto rezervaci?')) return

    try {
      const response = await fetch(`/api/hardware/reservations/${reservationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
      } else {
        const errorData = await response.json()
        alert(`Chyba: ${errorData.error || 'Neznámá chyba'}`)
      }
    } catch (error) {
      console.error('Error deleting reservation:', error)
    }
  }

  // Filter available items by category
  const availableItems = hardwareItems.filter(i => i.is_available)
  const categories = Array.from(new Set(availableItems.map(item => item.category))).sort()

  // Set initial category only once
  useEffect(() => {
    if (hardwareItems.length > 0 && !selectedCategory) {
      const avail = hardwareItems.filter(i => i.is_available)
      const cats = Array.from(new Set(avail.map(item => item.category))).sort()
      if (cats.length > 0) {
        setSelectedCategory(cats[0])
      }
    }
  }, [hardwareItems]) // eslint-disable-line react-hooks/exhaustive-deps

  // Count selected items per category for badges
  const getSelectedCountForCategory = (category: string): number => {
    const catItemIds = availableItems.filter(i => i.category === category).map(i => i.id)
    return catItemIds.reduce((sum, id) => sum + (selectedQuantities[id] || 0), 0)
  }

  const filteredItems = availableItems.filter(item => item.category === selectedCategory)
  const totalPrice = getTotalPrice()
  const totalSelected = getTotalSelectedCount()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">💻</div>
          <p className="text-gray-600">Načítám...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-red-50 p-4 pb-32">
      <EventGuestHeader session_slug={slug} />

      <GuestSelectionModal
        guests={guests}
        session_slug={slug}
        isOpen={showGuestSelection}
        onGuestSelected={(guest) => {
          setSelectedGuest(guest)
          setNightsCount(guest.nights_count || 1)
          setShowGuestSelection(false)
        }}
        onRegisterNew={() => {
          router.push(`/event/${slug}/register`)
        }}
      />

      <div className="max-w-5xl mx-auto py-6">
        <Link
          href={`/event/${slug}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zpět na event
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Monitor className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Rezervace Hardware
                </h1>
                {session && (
                  <p className="text-gray-600">
                    {session.name} • {formatDate(session.start_date)}
                  </p>
                )}
              </div>
            </div>
            {selectedGuest && (
              <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl">
                <span className="text-sm text-gray-600">Přihlášen/a:</span>
                <span className="font-bold text-purple-700">{selectedGuest.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* My Reservations Section */}
        {selectedGuest && (() => {
          const myReservations = reservations.filter(r => r.guest_id === selectedGuest.id && r.status !== 'cancelled')
          if (myReservations.length === 0) return null

          return (
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Moje rezervace ({myReservations.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0">
                        {reservation.hardware_items?.type === 'pc' ? (
                          <Cpu className="w-6 h-6 text-blue-600" />
                        ) : reservation.hardware_items?.type === 'monitor' ? (
                          <Monitor className="w-6 h-6 text-orange-600" />
                        ) : (
                          <Gamepad2 className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base">
                          {reservation.quantity > 1 ? `${reservation.quantity}× ` : ''}{reservation.hardware_items?.name || 'Neznámé zařízení'}
                        </h3>
                        {formatSpecs(reservation.hardware_items?.specs) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatSpecs(reservation.hardware_items?.specs)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-purple-200 pt-3 mt-3">
                      {editingReservationId === reservation.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Počet nocí</label>
                            <input
                              type="number"
                              min="1"
                              value={editNightsCount}
                              onChange={(e) => setEditNightsCount(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="text-sm text-gray-600">
                            Cena: {(reservation.hardware_items?.price_per_night || 0) * (reservation.quantity || 1) * editNightsCount} Kč
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(reservation.id)}
                              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              <Save className="w-4 h-4" /> Uložit
                            </button>
                            <button
                              onClick={() => setEditingReservationId(null)}
                              className="flex-1 flex items-center justify-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              <X className="w-4 h-4" /> Zrušit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Počet nocí:</span>
                            <span className="font-semibold text-gray-900">{reservation.nights_count}×</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Celková cena:</span>
                            <span className="font-bold text-purple-600">{reservation.total_price} Kč</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleEditReservation(reservation.id, reservation.nights_count)}
                              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              <Edit2 className="w-4 h-4" /> Upravit
                            </button>
                            <button
                              onClick={() => handleDeleteReservation(reservation.id)}
                              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm"
                            >
                              <Trash2 className="w-4 h-4" /> Smazat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {guests.length > 0 && !selectedGuest && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Vyber hosta</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {guests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => setSelectedGuest(guest)}
                  className="p-4 rounded-xl border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 text-left transition-all text-center"
                >
                  <p className="font-semibold text-gray-900 text-sm">{guest.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vyber kategorii</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => {
              const catItems = availableItems.filter(i => i.category === category)
              const totalAvailable = catItems.reduce((sum, i) => sum + getAvailableQty(i), 0)
              const totalStock = catItems.reduce((sum, i) => sum + (i.quantity || 1), 0)
              const firstItem = catItems[0]

              const prices = catItems.map(i => i.price_per_night)
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0
              const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
              const isFree = minPrice === 0 && maxPrice === 0

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-6 rounded-xl border-2 transition-all relative ${selectedCategory === category
                    ? 'border-orange-500 bg-orange-50 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                    }`}
                >
                  {getSelectedCountForCategory(category) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                      {getSelectedCountForCategory(category)}
                    </span>
                  )}
                  {firstItem && (
                    <div className="text-orange-600 flex justify-center mb-3">
                      {getItemIcon(firstItem, "w-12 h-12")}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                  <p className="text-3xl font-bold text-orange-600 my-2">
                    {isFree ? 'Zdarma' : minPrice !== maxPrice ? `${minPrice}–${maxPrice} Kč` : `${minPrice} Kč`}
                  </p>
                  {!isFree && (
                    <p className="text-sm text-gray-600">za noc</p>
                  )}
                  <p className={`text-xs mt-2 font-semibold ${totalAvailable > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {totalAvailable}/{totalStock} ks volných
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Hardware Items with +/- quantity */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedCategory}
          </h2>

          {filteredItems.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Momentálně není nic dostupné</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const available = getAvailableQty(item)
                const qty = selectedQuantities[item.id] || 0
                const isSelected = qty > 0
                const soldOut = available === 0

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-xl border-2 transition-all ${soldOut
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : isSelected
                        ? 'border-green-500 bg-green-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-orange-600">
                          {getItemIcon(item, "w-6 h-6")}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{item.name}</h3>
                          {formatSpecs(item.specs) && (
                            <p className="text-xs text-gray-500">
                              {formatSpecs(item.specs)}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-green-600" />}
                    </div>

                    {/* Price */}
                    <p className="text-lg font-bold text-orange-600 mb-3">
                      {item.price_per_night === 0 ? 'Zdarma' : `${item.price_per_night} Kč/noc`}
                    </p>

                    {/* Availability */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-semibold ${available > 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                        {soldOut ? '❌ Vše obsazeno' : `✅ ${available} ks volných`}
                      </span>
                      <span className="text-xs text-gray-400">
                        z {item.quantity || 1} ks celkem
                      </span>
                    </div>

                    {/* +/- Quantity controls */}
                    {!soldOut && selectedGuest && (
                      <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => changeQuantity(item.id, -1, available)}
                          disabled={qty === 0}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors font-bold text-lg ${qty === 0
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                        >
                          <Minus className="w-5 h-5" />
                        </button>

                        <span className={`text-2xl font-bold w-10 text-center ${qty > 0 ? 'text-green-600' : 'text-gray-400'
                          }`}>
                          {qty}
                        </span>

                        <button
                          onClick={() => changeQuantity(item.id, 1, available)}
                          disabled={qty >= available}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors font-bold text-lg ${qty >= available
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {!selectedGuest && !soldOut && (
                      <p className="text-xs text-gray-400 text-center pt-3 border-t border-gray-200">
                        Pro výběr se nejdřív přihlaš
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected items summary */}
        {totalSelected > 0 && selectedGuest && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-5 text-white mb-6">
            <h3 className="text-sm font-semibold text-green-100 mb-3">
              Vybrané položky ({totalSelected})
            </h3>

            <div className="space-y-1.5 mb-4">
              {Object.entries(selectedQuantities)
                .filter(([, q]) => q > 0)
                .map(([itemId, q]) => {
                  const item = hardwareItems.find(i => i.id === itemId)
                  if (!item) return null
                  const itemTotal = item.price_per_night * q * nightsCount
                  return (
                    <div key={itemId} className="flex items-center justify-between bg-white/15 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0">
                          {item.type === 'monitor' ? '📺' : item.type === 'pc' ? '💻' : '🎮'}
                        </span>
                        <span className="text-sm font-medium truncate">{q}× {item.name}</span>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0 ml-2">
                        {itemTotal === 0 ? 'Zdarma' : `${itemTotal} Kč`}
                      </span>
                    </div>
                  )
                })}
            </div>

            <div className="flex items-center justify-between border-t border-white/30 pt-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-green-100">Počet nocí:</p>
                  <p className="text-lg font-bold">{nightsCount}</p>
                </div>

                <div>
                  <p className="text-xs text-green-100">Celkem:</p>
                  <p className="text-2xl font-bold">{totalPrice} Kč</p>
                </div>
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                className="bg-white text-green-600 hover:bg-green-50 px-6 py-3 rounded-xl font-bold shadow-lg transition-colors"
              >
                Rezervovat
              </button>
            </div>
          </div>
        )}

        {/* All Reservations - grouped by item */}
        {reservations.filter(r => r.status !== 'cancelled').length > 0 && (() => {
          const activeReservations = reservations.filter(r => r.status !== 'cancelled')
          // Group by hardware item
          const grouped: Record<string, { item: any; people: { name: string; qty: number; nights: number }[] }> = {}
          activeReservations.forEach(r => {
            const itemId = r.hardware_item_id
            if (!grouped[itemId]) {
              grouped[itemId] = { item: r.hardware_items || { name: 'Neznámé', type: 'accessory' }, people: [] }
            }
            grouped[itemId].people.push({
              name: r.guests?.name || 'Neznámý host',
              qty: r.quantity || 1,
              nights: r.nights_count || 1,
            })
          })
          const sortedItems = Object.values(grouped).sort((a, b) => b.people.length - a.people.length)

          return (
            <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Kdo si co zarezervoval
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {activeReservations.length} rezervací od {new Set(activeReservations.map(r => r.guest_id)).size} hostů
              </p>

              <div className="space-y-3">
                {sortedItems.map(({ item, people }, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Item header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                      <span className="flex-shrink-0 text-lg">
                        {item.type === 'monitor' ? '📺' : item.type === 'pc' ? '💻' : '🎮'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                        {formatSpecs(item.specs) && (
                          <p className="text-xs text-gray-500">{formatSpecs(item.specs)}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {people.reduce((s, p) => s + p.qty, 0)}× rezervováno
                      </span>
                    </div>
                    {/* People list */}
                    <div className="px-4 py-2 flex flex-wrap gap-1.5">
                      {people.map((person, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                        >
                          {person.name}
                          {person.qty > 1 && <span className="font-bold">({person.qty}×)</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>


      {/* Confirm Modal */}
      {showConfirm && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Potvrzení rezervace</h2>

            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Přihlášen/a jako:</p>
              <p className="font-bold text-gray-900">{selectedGuest.name}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-3">Vybrané položky:</p>
              <div className="space-y-2 mb-4">
                {Object.entries(selectedQuantities)
                  .filter(([, q]) => q > 0)
                  .map(([itemId, q]) => {
                    const item = hardwareItems.find(i => i.id === itemId)
                    return (
                      <div key={itemId} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{q}× {item?.name}</p>
                          <p className="text-xs text-gray-500">{item?.price_per_night || 0} Kč/noc</p>
                        </div>
                        <p className="font-bold text-orange-600">
                          {(item?.price_per_night || 0) * q * nightsCount} Kč
                        </p>
                      </div>
                    )
                  })}
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                {nightsCount}× noc
              </p>
              <p className="text-2xl font-bold text-orange-600">{totalPrice} Kč</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Zrušit
              </button>
              <button
                onClick={handleReserve}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {submitting ? 'Rezervuji...' : 'Potvrdit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}