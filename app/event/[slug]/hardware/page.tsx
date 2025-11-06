'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Monitor, Cpu, Check, Gamepad2, Keyboard, Mouse, Headphones, Cable } from 'lucide-react'
import { Session, Guest } from '@/types/database.types'
import { HardwareItem } from '@/types/hardware.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'

// Helper function to get icon based on item name
const getItemIcon = (item: HardwareItem, className: string = "w-5 h-5") => {
  const name = item.name.toLowerCase()

  if (item.type === 'pc') {
    return <Cpu className={className} />
  } else if (item.type === 'monitor') {
    return <Monitor className={className} />
  } else if (item.type === 'accessory') {
    // Check name for specific accessories
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

export default function EventHardwarePage() {
  const params = useParams()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [nightsCount, setNightsCount] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

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
        }
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

        // Fetch reservations for this session
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

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }



  const handleReserve = async () => {
    if (!selectedGuest || selectedItems.length === 0 || !session) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/hardware/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          hardware_item_ids: selectedItems,
          nights_count: nightsCount,
          session_id: session.id,
        }),
      })

      if (response.ok) {
        setSelectedItems([])
        setShowConfirm(false)
        setNightsCount(1)
        setSelectedGuest(null)
        fetchData()
        alert('Rezervace byla úspěšně vytvořena!')
      } else {
        const errorData = await response.json()
        console.error('Reservation error:', errorData)
        const errorMsg = errorData.details || errorData.error || 'Neznámá chyba'
        alert(`Chyba při vytváření rezervace: ${errorMsg}`)
      }
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert(`Chyba při vytváření rezervace: ${error instanceof Error ? error.message : 'Neznámá chyba'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Group hardware by category
  const categories = Array.from(new Set(hardwareItems.map(item => item.category))).sort()

  // Set initial category when hardware items are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  const filteredItems = hardwareItems.filter(item =>
    item.category === selectedCategory && item.is_available
  )
  const selectedItemsDetails = hardwareItems.filter(item => selectedItems.includes(item.id))
  const totalPrice = selectedItemsDetails.reduce((sum, item) => sum + (item.price_per_night * nightsCount), 0)

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-red-50 p-4">
      <EventGuestHeader session_slug={slug} />
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
          </div>
        </div>

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

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vyber kategorii</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => {
              const categoryItems = hardwareItems.filter(item => item.category === category && item.is_available)
              const hasPC = categoryItems.some(item => item.type === 'pc')
              const hasAccessory = categoryItems.some(item => item.type === 'accessory')
              const hasMonitor = categoryItems.some(item => item.type === 'monitor')

              // Get icon for category - use first item's icon
              const firstItem = categoryItems[0]

              // Calculate price range for monitors
              const prices = categoryItems.map(item => item.price_per_night)
              const minPrice = Math.min(...prices)
              const maxPrice = Math.max(...prices)
              const isFree = minPrice === 0 && maxPrice === 0

              return (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category)
                    setSelectedItems([])
                  }}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedCategory === category
                      ? 'border-orange-500 bg-orange-50 shadow-lg'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {firstItem && (
                    <div className="text-orange-600 flex justify-center mb-3">
                      {getItemIcon(firstItem, "w-12 h-12")}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                  <p className="text-3xl font-bold text-orange-600 my-2">
                    {isFree ? 'Zdarma' : hasMonitor && minPrice !== maxPrice ? `${minPrice}-${maxPrice} Kč` : `${minPrice} Kč`}
                  </p>
                  {!isFree && (
                    <p className="text-sm text-gray-600">za noc</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {categoryItems.length} ks dostupných
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedCategory} ({filteredItems.length} ks dostupných)
          </h2>
          
          {filteredItems.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Momentálně není nic dostupné</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isSelected = selectedItems.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-orange-600">
                          {getItemIcon(item, "w-5 h-5")}
                        </div>
                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{(item as any).description || 'Bez popisu'}</p>
                    </div>
                    <p className="text-lg font-bold text-orange-600 mt-2">
                      {item.price_per_night === 0 ? 'Zdarma' : `${item.price_per_night} Kč/noc`}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedItems.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Vybrané položky</h3>
                <p className="text-green-100">
                  {selectedItems.length}× položka • {nightsCount}× noc
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm text-green-100 mb-1">Počet nocí:</label>
                  <input
                    type="number"
                    min="1"
                    value={nightsCount}
                    onChange={(e) => setNightsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 rounded-lg border-2 border-white bg-white text-gray-900 font-bold text-center"
                  />
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-green-100">Celková cena:</p>
                  <p className="text-3xl font-bold">{totalPrice} Kč</p>
                </div>
                
                <button
                  onClick={() => setShowConfirm(true)}
                  className="bg-white text-green-600 hover:bg-green-50 px-6 py-3 rounded-xl font-bold shadow-lg transition-colors"
                >
                  Rezervovat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reservations List */}
        {reservations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Rezervace hardware ({reservations.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0">
                      {reservation.hardware_items?.type === 'pc' ? (
                        <Cpu className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Monitor className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {reservation.hardware_items?.name || 'Neznámé zařízení'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate">
                        {(reservation.hardware_items as any)?.description || ''}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      {reservation.guests?.name || 'Neznámý host'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {reservation.nights_count}× noc • {reservation.total_price} Kč
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
                {selectedItemsDetails.map((item) => (
                  <div key={item.id} className="bg-white p-2 rounded border border-gray-200">
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.price_per_night} Kč/noc</p>
                  </div>
                ))}
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                {nightsCount}× noc
              </p>
              <p className="text-2xl font-bold text-orange-600">{totalPrice} Kč</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setSelectedGuest(null)
                }}
                disabled={submitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Zrušit
              </button>
              <button
                onClick={handleReserve}
                disabled={!selectedGuest || submitting}
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