'use client'

import { useState, useEffect } from 'react'
import { Calendar, UserPlus, Trophy, Beer, TrendingUp, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Session, Guest, Product } from '@/types/database.types'
import { formatDate } from '@/lib/utils'

interface GuestWithConsumption extends Guest {
  consumption: Array<{
    id: string
    quantity: number
    products: Product
  }>
  totalItems: number
  totalBeers: number
  totalPrice: number
}

export default function SnacksPage() {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<GuestWithConsumption[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<GuestWithConsumption | null>(null)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [newGuestName, setNewGuestName] = useState('')

  useEffect(() => {
    fetchData(true)
  }, [])

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)

      // Fetch active session
      const sessionRes = await fetch('/api/sessions/active')
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setActiveSession(sessionData.session)
      }

      // Fetch guests with consumption
      const guestsRes = await fetch('/api/snacks/guests-with-consumption')
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests)
        // Also update the selected guest with fresh data
        setSelectedGuest(prev => {
          if (!prev) return null
          const updated = guestsData.guests.find((g: GuestWithConsumption) => g.id === prev.id)
          return updated || null
        })
      }

      // Fetch products
      const productsRes = await fetch('/api/products')
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGuestName.trim()) return

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGuestName.trim() }),
      })

      if (response.ok) {
        setNewGuestName('')
        setShowAddGuest(false)
        fetchData()
      }
    } catch (error) {
      console.error('Error adding guest:', error)
    }
  }

  const handleAddProduct = async (productId: string) => {
    if (!selectedGuest) return

    // Find the product being added
    const product = products.find(p => p.id === productId)
    if (!product) return

    // Optimistic update: immediately update local state
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const newConsumptionItem = {
      id: tempId,
      quantity: 1,
      products: product,
    }

    // Update the selected guest's consumption locally
    setSelectedGuest(prev => {
      if (!prev) return null
      return {
        ...prev,
        consumption: [...prev.consumption, newConsumptionItem],
        totalItems: prev.totalItems + 1,
        totalBeers: product.category?.toLowerCase().includes('piv') ? prev.totalBeers + 1 : prev.totalBeers,
        totalPrice: prev.totalPrice + product.price,
      }
    })

    // Update the guests array too
    setGuests(prev => prev.map(g => {
      if (g.id !== selectedGuest.id) return g
      return {
        ...g,
        consumption: [...g.consumption, newConsumptionItem],
        totalItems: g.totalItems + 1,
        totalBeers: product.category?.toLowerCase().includes('piv') ? g.totalBeers + 1 : g.totalBeers,
        totalPrice: g.totalPrice + product.price,
      }
    }))

    try {
      const response = await fetch('/api/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          product_id: productId,
          quantity: 1,
        }),
      })

      if (response.ok) {
        // Silently sync real data from server in background
        fetchData()
      }
    } catch (error) {
      console.error('Error adding product:', error)
      // On error, re-fetch to restore correct state
      fetchData()
    }
  }

  const handleDeleteProduct = async (consumptionId: string) => {
    // Optimistic update: immediately remove from local state
    const removedItem = selectedGuest?.consumption.find(c => c.id === consumptionId)

    if (selectedGuest && removedItem) {
      setSelectedGuest(prev => {
        if (!prev) return null
        return {
          ...prev,
          consumption: prev.consumption.filter(c => c.id !== consumptionId),
          totalItems: prev.totalItems - removedItem.quantity,
          totalBeers: removedItem.products.category?.toLowerCase().includes('piv') ? prev.totalBeers - removedItem.quantity : prev.totalBeers,
          totalPrice: prev.totalPrice - (removedItem.products.price * removedItem.quantity),
        }
      })

      setGuests(prev => prev.map(g => {
        if (g.id !== selectedGuest.id) return g
        return {
          ...g,
          consumption: g.consumption.filter(c => c.id !== consumptionId),
          totalItems: g.totalItems - removedItem.quantity,
          totalBeers: removedItem.products.category?.toLowerCase().includes('piv') ? g.totalBeers - removedItem.quantity : g.totalBeers,
          totalPrice: g.totalPrice - (removedItem.products.price * removedItem.quantity),
        }
      }))
    }

    try {
      const response = await fetch(`/api/consumption?id=${consumptionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        // Silently sync real data from server in background
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      fetchData()
    }
  }

  // Calculate top 3 eaters and beer drinkers
  const topEaters = [...guests]
    .sort((a, b) => b.totalItems - a.totalItems)
    .slice(0, 3)

  const topBeerDrinkers = [...guests]
    .filter(g => g.totalBeers > 0)
    .sort((a, b) => b.totalBeers - a.totalBeers)
    .slice(0, 3)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🍕</div>
          <p className="text-gray-600">Načítám...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto py-6">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zpět na hlavní stránku
        </Link>

        {/* Header with Event Info */}
        <div className="bg-[#efefef] rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {activeSession?.name || 'Žádný aktivní event'}
                </h1>
                {activeSession && (
                  <p className="text-gray-600">
                    {formatDate(activeSession.start_date)}
                    {activeSession.end_date && ` - ${formatDate(activeSession.end_date)}`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Přidat hosta
            </button>
          </div>
        </div>

        {/* Leaderboard - Compact */}
        {guests.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Top Eaters */}
            <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <h2 className="text-lg font-bold text-gray-900">TOP Jedlíci</h2>
              </div>
              <div className="space-y-2">
                {topEaters.map((guest, index) => (
                  <div
                    key={guest.id}
                    className="bg-[#efefef] rounded-lg p-2 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="font-semibold text-gray-900 truncate">{guest.name}</span>
                    </div>
                    <div className="text-right whitespace-nowrap ml-2">
                      <p className="font-bold text-orange-600">{guest.totalItems}×</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Beer Drinkers */}
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Beer className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">TOP Pivaři</h2>
              </div>
              <div className="space-y-2">
                {topBeerDrinkers.length > 0 ? (
                  topBeerDrinkers.map((guest, index) => (
                    <div
                      key={guest.id}
                      className="bg-[#efefef] rounded-lg p-2 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="font-semibold text-gray-900 truncate">{guest.name}</span>
                      </div>
                      <div className="text-right whitespace-nowrap ml-2">
                        <p className="font-bold text-blue-600">{guest.totalBeers}× 🍺</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-center py-2 text-sm">Zatím nikdo 😢</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guests List */}
        <div className="bg-[#efefef] rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">Hosté a jejich spotřeba</h2>
          </div>

          {guests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">Zatím nejsou žádní hosté</p>
              <button
                onClick={() => setShowAddGuest(true)}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Přidej prvního hosta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {guests.map((guest) => (
                <div
                  key={guest.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-400 transition-colors"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{guest.name}</h3>
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {guest.totalItems}× položek
                        </span>
                        {guest.totalBeers > 0 && (
                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {guest.totalBeers}× 🍺
                          </span>
                        )}
                      </div>
                      {guest.consumption.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {guest.consumption.map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm flex items-center gap-2 group hover:bg-red-50 transition-colors"
                            >
                              <span>{item.quantity}× {item.products.name}</span>
                              <button
                                onClick={() => handleDeleteProduct(item.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity ml-1"
                                title="Smazat položku"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Zatím nic nesnědl</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">
                          {guest.totalPrice.toFixed(0)} Kč
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedGuest(guest)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap"
                      >
                        Přidat položku
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#efefef] rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Přidat nového hosta</h2>
            <form onSubmit={handleAddGuest}>
              <input
                type="text"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                placeholder="Jméno hosta..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGuest(false)
                    setNewGuestName('')
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={!newGuestName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Přidat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#efefef] rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Přidat položku pro {selectedGuest.name}
            </h2>
            <p className="text-gray-600 mb-6">Vyber, co si dal/a</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product.id)}
                  className="bg-gradient-to-br from-orange-100 to-red-100 hover:from-orange-200 hover:to-red-200 border-2 border-orange-300 hover:border-orange-500 rounded-xl p-4 text-center transition-all hover:scale-105"
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-20 object-contain mb-2"
                    />
                  )}
                  <p className="font-semibold text-gray-900 text-sm mb-1">{product.name}</p>
                  <p className="text-orange-600 font-bold">{product.price} Kč</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedGuest(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}
    </div>
  )
}