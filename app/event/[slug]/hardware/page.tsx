'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Monitor, Cpu, Check, Gamepad2, Keyboard, Mouse, Headphones, Cable, Edit2, Trash2, X, Save, Plus, Minus } from 'lucide-react'
import { Session, Guest, GameLibraryItem } from '@/types/database.types'
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
  // Game install selection
  const [libraryGames, setLibraryGames] = useState<GameLibraryItem[]>([])
  const [showGameInstallPicker, setShowGameInstallPicker] = useState(false)
  const [selectedGameInstalls, setSelectedGameInstalls] = useState<Set<string>>(new Set())
  const [savingGameInstalls, setSavingGameInstalls] = useState(false)
  const [existingGameInstalls, setExistingGameInstalls] = useState<string[]>([])

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
      }
      // Don't force guest selection — let users browse freely
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

      // Fetch game library
      const gameLibRes = await fetch('/api/game-library')
      if (gameLibRes.ok) {
        const gameLibData = await gameLibRes.json()
        setLibraryGames(gameLibData.games || [])
      }

      // Fetch existing game install requests
      if (sessionRes.ok) {
        const sessionData = await (await fetch(`/api/event/${slug}`)).json()
        const installRes = await fetch(`/api/game-installs?session_id=${sessionData.session.id}`)
        if (installRes.ok) {
          const installData = await installRes.json()
          // Find this guest's installs
          const currentGuest = guestStorage.getCurrentGuest(slug)
          if (currentGuest) {
            const myInstalls = (installData.requests || []).find((r: any) => r.guest_id === currentGuest.id)
            if (myInstalls) {
              setExistingGameInstalls(myInstalls.game_names || [])
              setSelectedGameInstalls(new Set(myInstalls.game_names || []))
            }
          }
        }
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
    // If no guest selected, prompt them to pick one first
    if (!selectedGuest) {
      setShowGuestSelection(true)
      return
    }
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
        const result = await response.json()
        setSelectedQuantities({})
        setShowConfirm(false)
        setNightsCount(1)

        // Check if any PC was reserved — if yes, show game install picker
        const hasPc = Object.entries(selectedQuantities)
          .filter(([, q]) => q > 0)
          .some(([itemId]) => {
            const item = hardwareItems.find(i => i.id === itemId)
            return item?.type === 'pc'
          })

        await fetchData()

        if (hasPc && libraryGames.length > 0) {
          setShowGameInstallPicker(true)
        } else {
          alert('Rezervace byla úspěšně vytvořena!')
        }
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

  // Has any PC type selected?
  const hasPcSelected = Object.entries(selectedQuantities)
    .filter(([, q]) => q > 0)
    .some(([itemId]) => hardwareItems.find(i => i.id === itemId)?.type === 'pc')

  // Toggle game install selection
  const toggleGameInstall = (gameName: string) => {
    setSelectedGameInstalls(prev => {
      const next = new Set(prev)
      if (next.has(gameName)) {
        next.delete(gameName)
      } else {
        next.add(gameName)
      }
      return next
    })
  }

  const handleSaveGameInstalls = async () => {
    if (!selectedGuest || !session) return
    setSavingGameInstalls(true)
    try {
      const pcReservationIds = reservations
        .filter(r => r.guest_id === selectedGuest.id && r.hardware_items?.type === 'pc' && r.status !== 'cancelled')
        .map(r => r.id)

      await fetch('/api/game-installs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          session_id: session.id,
          reservation_ids: pcReservationIds,
          game_names: Array.from(selectedGameInstalls),
        }),
      })

      setExistingGameInstalls(Array.from(selectedGameInstalls))
      setShowGameInstallPicker(false)
      alert('Rezervace proběhla a hry byly vybrány! 🎮')
    } catch (error) {
      console.error('Error saving game installs:', error)
      alert('Chyba při ukládání her')
    } finally {
      setSavingGameInstalls(false)
    }
  }

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
      <EventGuestHeader session_slug={slug} onLogout={() => {
        setSelectedGuest(null)
        setSelectedQuantities({})
      }} />

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
            .sort((a, b) => {
              const typeOrder = (t?: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2
              return typeOrder(a.hardware_items?.type) - typeOrder(b.hardware_items?.type)
            })
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
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
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
                      <button
                        onClick={() => handleDeleteReservation(reservation.id)}
                        className="flex-shrink-0 inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Zrušit
                      </button>
                    </div>

                    {reservation.total_price > 0 && (
                      <div className="border-t border-purple-200 pt-2 mt-3">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-gray-500">Cena:</span>
                          <span className="font-bold text-purple-600">{reservation.total_price} Kč</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}



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

                    {/* +/- Quantity controls — always shown for available items */}
                    {!soldOut && (
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
                          disabled={qty >= available && !!selectedGuest}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors font-bold text-lg ${qty >= available && !!selectedGuest
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
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

        {/* All Reservations - grouped by guest */}
        {reservations.filter(r => r.status !== 'cancelled').length > 0 && (() => {
          const activeReservations = reservations.filter(r => r.status !== 'cancelled')
          // Group by guest
          const typeOrder = (t?: string) => t === 'pc' ? 0 : t === 'monitor' ? 1 : 2
          const guestMap: Record<string, { guestId: string; name: string; items: { id: string; name: string; type: string; qty: number; nights: number; price: number }[] }> = {}
          activeReservations.forEach(r => {
            const gid = r.guest_id
            if (!guestMap[gid]) {
              guestMap[gid] = { guestId: gid, name: r.guests?.name || 'Neznámý host', items: [] }
            }
            guestMap[gid].items.push({
              id: r.id,
              name: r.hardware_items?.name || 'Neznámý HW',
              type: r.hardware_items?.type || 'other',
              qty: r.quantity || 1,
              nights: r.nights_count || 1,
              price: r.total_price || 0,
            })
          })
          // Sort items within each guest: PC → Monitor → Accessories
          Object.values(guestMap).forEach(guest => {
            guest.items.sort((a, b) => typeOrder(a.type) - typeOrder(b.type))
          })
          const sortedGuests = Object.values(guestMap).sort((a, b) => a.name.localeCompare(b.name))

          const handleSwitchToGuest = (guestId: string) => {
            const guest = guests.find(g => g.id === guestId)
            if (guest) {
              setSelectedGuest(guest)
              setNightsCount(guest.nights_count || 1)
              guestStorage.setCurrentGuest({ id: guest.id, name: guest.name, session_slug: slug })
              // Reset quantity selections when switching guests
              setSelectedQuantities({})
              // Scroll to top so they see My Reservations
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }

          return (
            <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Kdo si co zarezervoval
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {activeReservations.length} rezervací od {sortedGuests.length} hostů • klikni na jméno pro editaci
              </p>

              <div className="divide-y divide-gray-100">
                {sortedGuests.map((guest, idx) => {
                  const isMe = selectedGuest?.id === guest.guestId
                  return (
                    <div key={idx} className={`py-3 ${isMe ? 'bg-purple-50 -mx-2 px-2 rounded-lg' : ''}`}>
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleSwitchToGuest(guest.guestId)}
                          className={`flex items-center gap-2 w-40 flex-shrink-0 pt-0.5 text-left group transition-colors ${isMe
                            ? 'cursor-default'
                            : 'hover:text-purple-600'
                            }`}
                          title={isMe ? 'Aktuálně přihlášen/a' : `Přepnout na ${guest.name}`}
                        >
                          <span className={`font-semibold ${isMe ? 'text-purple-700' : 'text-gray-900 group-hover:text-purple-600'}`}>
                            {guest.name}
                          </span>
                          {isMe ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-700 font-medium">ty</span>
                          ) : (
                            <Edit2 className="w-3 h-3 text-gray-300 group-hover:text-purple-500 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {guest.items.map((item, i) => (
                            <div key={item.id} className="inline-flex items-center gap-1">
                              <span className="text-sm text-gray-700">
                                {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                              </span>
                              {i < guest.items.length - 1 && <span className="text-gray-300 ml-0.5">,</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
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

            {hasPcSelected && libraryGames.length > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-violet-800">
                  🎮 Po potvrzení si budeš moci vybrat hry k instalaci na PC!
                </p>
              </div>
            )}

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

      {/* Game Install Picker Modal */}
      {showGameInstallPicker && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl">🎮</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Výběr her k instalaci</h2>
                <p className="text-sm text-gray-500">Které hry chceš mít nainstalované na tvém PC?</p>
              </div>
            </div>

            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-violet-800">
                Vyber hry, které chceš mít připravené na svém PC při příjezdu. Admin je nainstaluje předem.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {libraryGames.map(game => {
                const isSelected = selectedGameInstalls.has(game.name)
                return (
                  <button
                    key={game.id}
                    onClick={() => toggleGameInstall(game.name)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-md'
                      : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${isSelected
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                      }`}>
                      {isSelected ? '✓' : '+'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${isSelected ? 'text-violet-900' : 'text-gray-900'}`}>
                        {game.name}
                      </p>
                      <div className="flex gap-2 mt-0.5">
                        {game.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {game.category}
                          </span>
                        )}
                        {game.max_players && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            👥 max {game.max_players}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Vybráno: <span className="font-bold text-violet-600">{selectedGameInstalls.size}</span> her
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowGameInstallPicker(false)
                    alert('Rezervace byla vytvořena! Hry můžeš vybrat později.')
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium text-sm"
                >
                  Přeskočit
                </button>
                <button
                  onClick={handleSaveGameInstalls}
                  disabled={savingGameInstalls}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {savingGameInstalls ? 'Ukládám...' : `Potvrdit výběr (${selectedGameInstalls.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing game install info */}
      {selectedGuest && existingGameInstalls.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 mb-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-violet-900 text-sm flex items-center gap-2">
                🎮 Tvoje vybrané hry k instalaci
              </h3>
              <button
                onClick={() => setShowGameInstallPicker(true)}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium underline"
              >
                Upravit
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {existingGameInstalls.map((name, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium border border-violet-200">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}