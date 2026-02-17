'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Monitor, Cpu, Check, X } from 'lucide-react'
import Link from 'next/link'
import { Session, Guest } from '@/types/database.types'
import { HardwareItem } from '@/types/hardware.types'
import { formatDate } from '@/lib/utils'

export default function HardwarePage() {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [hardwareItems, setHardwareItems] = useState<HardwareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<'200' | '100' | '250'>('200')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [nightsCount, setNightsCount] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

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
      const guestsRes = await fetch('/api/snacks/guests-with-consumption')
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests)
      }

      // Fetch hardware items
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
    if (!selectedGuest || selectedItems.length === 0) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/hardware/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          hardware_item_ids: selectedItems,
          nights_count: nightsCount,
        }),
      })

      if (response.ok) {
        // Reset form
        setSelectedItems([])
        setSelectedGuest(null)
        setShowConfirm(false)
        setNightsCount(1)
        fetchData() // Refresh data
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

  const filteredItems = hardwareItems.filter(item => item.category === selectedCategory && item.is_available)
  const selectedItemsDetails = hardwareItems.filter(item => selectedItems.includes(item.id))
  const totalPrice = selectedItems.length * parseInt(selectedCategory) * nightsCount

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
      <div className="max-w-7xl mx-auto py-6">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zpět na hlavní stránku
        </Link>

        {/* Header */}
        <div className="bg-[#efefef] rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Monitor className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Rezervace Hardware
                </h1>
                {activeSession && (
                  <p className="text-gray-600">
                    {activeSession.name} • {formatDate(activeSession.start_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Selector */}
        <div className="bg-[#efefef] rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vyber kategorii</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedCategory('200')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedCategory === '200'
                  ? 'border-orange-500 bg-orange-50 shadow-lg'
                  : 'border-gray-200 hover:border-orange-300'
              }`}
            >
              <Monitor className="w-12 h-12 text-orange-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Monitory Premium</h3>
              <p className="text-3xl font-bold text-orange-600 my-2">200 Kč</p>
              <p className="text-sm text-gray-600">za noc</p>
              <p className="text-xs text-gray-500 mt-2">QHD/WQHD • 144-240Hz</p>
            </button>

            <button
              onClick={() => setSelectedCategory('100')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedCategory === '100'
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <Monitor className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Monitory Standard</h3>
              <p className="text-3xl font-bold text-purple-600 my-2">100 Kč</p>
              <p className="text-sm text-gray-600">za noc</p>
              <p className="text-xs text-gray-500 mt-2">Full HD/WQHD • 165Hz</p>
            </button>

            <button
              onClick={() => setSelectedCategory('250')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedCategory === '250'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <Cpu className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Gaming PC</h3>
              <p className="text-3xl font-bold text-blue-600 my-2">250 Kč</p>
              <p className="text-sm text-gray-600">za noc</p>
              <p className="text-xs text-gray-500 mt-2">i5 14400F • RTX 5070</p>
            </button>
          </div>
        </div>

        {/* Hardware List */}
        <div className="bg-[#efefef] rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Dostupné {selectedCategory === '250' ? 'PC' : 'monitory'} ({filteredItems.length} ks)
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
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      {isSelected && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                    {item.type === 'monitor' && item.specs ? (
                      <div className="text-sm text-gray-600">
                        <p>{item.specs.resolution} • {item.specs.diagonal}"</p>
                        <p>{item.specs.hz} Hz</p>
                      </div>
                    ) : item.type === 'pc' && item.specs ? (
                      <div className="text-sm text-gray-600">
                        <p>{item.specs.cpu}</p>
                        <p>{item.specs.ram} • {item.specs.gpu}</p>
                      </div>
                    ) : null}
                    <p className="text-lg font-bold text-orange-600 mt-2">
                      {item.price_per_night} Kč/noc
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Items Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Vybrané položky</h3>
                <p className="text-green-100">
                  {selectedItems.length}× {selectedCategory === '250' ? 'PC' : 'monitor'} • {nightsCount}× noc
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
                    className="w-24 px-3 py-2 rounded-lg border-2 border-white bg-[#efefef] text-gray-900 font-bold text-center"
                  />
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-green-100">Celková cena:</p>
                  <p className="text-3xl font-bold">{totalPrice} Kč</p>
                </div>
                
                <button
                  onClick={() => setShowConfirm(true)}
                  className="bg-[#efefef] text-green-600 hover:bg-green-50 px-6 py-3 rounded-xl font-bold shadow-lg transition-colors"
                >
                  Rezervovat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#efefef] rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rezervace hardware</h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">Vyber svého hosta:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {guests.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => setSelectedGuest(guest)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedGuest?.id === guest.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className="font-semibold text-gray-900">{guest.name}</span>
                    {selectedGuest?.id === guest.id && (
                      <Check className="w-5 h-5 text-green-600 inline ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-3">Vybrané položky:</p>
              <div className="space-y-2 mb-4">
                {selectedItemsDetails.map((item) => (
                  <div key={item.id} className="bg-[#efefef] p-2 rounded border border-gray-200">
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