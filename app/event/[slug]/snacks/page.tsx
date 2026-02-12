'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, UserPlus, Trash2, Trophy, Beer } from 'lucide-react'
import { Session, Guest, Product } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'
import GuestSelectionModal from '@/components/GuestSelectionModal'

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

export default function EventSnacksPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<GuestWithConsumption[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<GuestWithConsumption | null>(null)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [newGuestName, setNewGuestName] = useState('')
  const [mounted, setMounted] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [showGuestSelection, setShowGuestSelection] = useState(false)

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
      } else {
        // No guest selected, show selection modal
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
      }

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json()
        setGuests(guestsData.guests)
      }

      const productsRes = await fetch(`/api/event/${slug}/products`)
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGuestName.trim()) return

    try {
      const response = await fetch(`/api/event/${slug}/guests`, {
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

    try {
      const response = await fetch('/api/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: selectedGuest.id,
          product_id: productId,
          quantity: 1,
          session_id: session?.id,
        }),
      })

      if (response.ok) {
        setJustAdded(productId)
        setTimeout(() => setJustAdded(null), 1000)
        fetchData()
      }
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  const handleDeleteProduct = async (consumptionId: string) => {
    try {
      const response = await fetch(`/api/consumption?id=${consumptionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex flex-col">
      <EventGuestHeader session_slug={slug} />

      {/* Guest Selection Modal */}
      <GuestSelectionModal
        guests={guests}
        session_slug={slug}
        isOpen={showGuestSelection}
        onGuestSelected={(guest) => {
          setSelectedGuest(guest as GuestWithConsumption)
          setShowGuestSelection(false)
        }}
        onRegisterNew={() => {
          router.push(`/event/${slug}/register`)
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/event/${slug}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {session?.name || 'Event'} - Pochutiny
                </h1>
                {session && (
                  <p className="text-sm text-gray-600">
                    {formatDate(session.start_date)}
                    {session.end_date && ` - ${formatDate(session.end_date)}`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-5 h-5" />
              Přidat hosta
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  {/* TOP 3 Leaderboard */}
                  {guests.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {/* Top Eaters */}
                      <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg shadow p-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Trophy className="w-4 h-4 text-yellow-600" />
                          <h3 className="text-sm font-bold text-gray-900">TOP Jedlíci</h3>
                        </div>
                        <div className="space-y-1">
                          {topEaters.map((guest, index) => (
                            <div key={guest.id} className="bg-white rounded p-1.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                                <span className="font-semibold text-gray-900 truncate text-xs">{guest.name}</span>
                              </div>
                              <span className="font-bold text-orange-600 whitespace-nowrap ml-1">{guest.totalItems}×</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Beer Drinkers */}
                      <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg shadow p-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Beer className="w-4 h-4 text-blue-600" />
                          <h3 className="text-sm font-bold text-gray-900">TOP Pivaři</h3>
                        </div>
                        <div className="space-y-1">
                          {topBeerDrinkers.length > 0 ? (
                            topBeerDrinkers.map((guest, index) => (
                              <div key={guest.id} className="bg-white rounded p-1.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                                  <span className="font-semibold text-gray-900 truncate text-xs">{guest.name}</span>
                                </div>
                                <span className="font-bold text-blue-600 whitespace-nowrap ml-1">{guest.totalBeers}×</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-600 text-center py-1 text-xs">Zatím nikdo 😢</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <h2 className="text-xl font-bold text-gray-900 mb-4">Hosté</h2>
                  <div className="space-y-2">
                    {guests.map((guest) => (
                      <button
                        key={guest.id}
                        onClick={() => {
                          setSelectedGuest(guest)
                          guestStorage.setCurrentGuest({
                            id: guest.id,
                            name: guest.name,
                            session_slug: slug,
                          })
                        }}
                        className={`w-full text-left p-4 rounded-xl font-semibold transition-all ${
                          selectedGuest?.id === guest.id
                            ? 'bg-orange-600 text-white shadow-lg'
                            : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-orange-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{guest.name}</span>
                          <span className="text-sm font-normal">
                            {guest.totalItems}× ({guest.totalPrice.toFixed(0)} Kč)
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {!selectedGuest ? (
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                      <p className="text-lg text-gray-600">Vyber si hosta ze seznamu →</p>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-4 mb-6">
                        <p className="text-gray-700 text-sm mb-1">Vybíráš pro:</p>
                        <p className="text-2xl font-bold text-orange-900">{selectedGuest.name}</p>
                        {selectedGuest.consumption.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-orange-300">
                            <p className="text-gray-700 text-sm mb-3 font-semibold">Zatím koupeno:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from(
                                selectedGuest.consumption.reduce((acc, item) => {
                                  const key = item.products.id
                                  if (!acc.has(key)) {
                                    acc.set(key, { ...item, totalQuantity: 0 })
                                  }
                                  const grouped = acc.get(key)!
                                  grouped.totalQuantity += item.quantity
                                  return acc
                                }, new Map<string, any>()).values()
                              )
                                .sort((a, b) => (a.products.category || '').localeCompare(b.products.category || ''))
                                .map((grouped) => {
                                  const firstItem = selectedGuest.consumption.find(c => c.products.id === grouped.products.id)
                                  return (
                                    <div key={grouped.products.id} className="flex items-center justify-between bg-white rounded-lg p-2">
                                      <div>
                                        <p className="text-xs text-gray-500">{grouped.products.category}</p>
                                        <p className="text-gray-700 font-medium">{grouped.totalQuantity}× {grouped.products.name}</p>
                                      </div>
                                      <button
                                        onClick={() => firstItem && handleDeleteProduct(firstItem.id)}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Smazat položku"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-gray-900 mb-4">Pochutiny - Klikni a přidej!</h2>
                      {products.length === 0 ? (
                        <p className="text-gray-600">Zatím žádné pochutiny nejsou k dispozici</p>
                      ) : (
                        <div className="space-y-6">
                          {Array.from(
                            products.reduce((acc, product) => {
                              const category = product.category || 'Ostatní'
                              if (!acc.has(category)) {
                                acc.set(category, [])
                              }
                              acc.get(category)!.push(product)
                              return acc
                            }, new Map<string, typeof products>()).entries()
                          )
                            .sort(([catA], [catB]) => catA.localeCompare(catB))
                            .map(([category, categoryProducts]) => (
                              <div key={category}>
                                <h3 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b-2 border-orange-300">
                                  {category}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {categoryProducts.map((product) => (
                                    <button
                                      key={product.id}
                                      onClick={() => handleAddProduct(product.id)}
                                      className={`relative rounded-xl p-5 text-center transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                                        justAdded === product.id
                                          ? 'bg-green-500 text-white shadow-xl scale-105'
                                          : 'bg-white hover:shadow-xl border-2 border-gray-200 hover:border-orange-400 text-gray-900'
                                      }`}
                                    >
                                      {product.image_url ? (
                                        <div className="bg-white rounded-lg p-3 mb-3">
                                          <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-32 object-contain"
                                          />
                                        </div>
                                      ) : (
                                        <div className="bg-gray-100 rounded-lg p-3 mb-3 h-32 flex items-center justify-center">
                                          <span className="text-4xl">🍽️</span>
                                        </div>
                                      )}
                                      <p className="font-semibold text-base mb-2">{product.name}</p>
                                      <p className={`font-bold text-lg ${
                                        justAdded === product.id ? 'text-white' : 'text-orange-600'
                                      }`}>
                                        {product.price} Kč
                                      </p>
                                      {justAdded === product.id && (
                                        <div className="absolute inset-0 flex items-center justify-center text-5xl">
                                          ✓
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
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
    </div>
  )
}