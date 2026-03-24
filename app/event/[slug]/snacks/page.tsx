'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus, Trophy, Beer, Filter, Clock, CalendarOff, Heart } from 'lucide-react'
import { Session, Guest, Product } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import NestPage from '@/components/NestPage'
import NestLoading from '@/components/NestLoading'
import { useGuestAuth } from '@/lib/auth-context'

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

interface FavoriteProduct {
  product_id: string
  name: string
  price: number
  category: string | null
  image_url: string | null
  total_count: number
}

export default function EventSnacksPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const { firebaseUser, isAuthenticated } = useGuestAuth()

  const [session, setSession] = useState<Session | null>(null)
  const [guests, setGuests] = useState<GuestWithConsumption[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<GuestWithConsumption | null>(null)

  const [mounted, setMounted] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [userFavorites, setUserFavorites] = useState<FavoriteProduct[]>([])

  // Debounced fetch to prevent rapid-click flickering
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fetchCounterRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch cross-event favorites for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser) return
    const fetchFavorites = async () => {
      try {
        const token = await firebaseUser.getIdToken()
        const res = await fetch('/api/auth/favorites', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUserFavorites(data.favorites || [])
        }
      } catch { }
    }
    fetchFavorites()
  }, [isAuthenticated, firebaseUser])

  useEffect(() => {
    if (slug) {
      fetchData(true)
    }
  }, [slug])

  // Debounced server sync - only runs after 800ms of no new clicks
  const debouncedFetchData = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
    }
    syncTimerRef.current = setTimeout(() => {
      fetchData(false)
    }, 800)
  }, [slug])


  const fetchData = async (isInitial = false) => {
    const currentFetchId = ++fetchCounterRef.current
    try {
      if (isInitial) setLoading(true)

      const sessionRes = await fetch(`/api/event/${slug}`)
      // Ignore stale responses
      if (currentFetchId !== fetchCounterRef.current) return
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData.session)
      }

      const guestsRes = await fetch(`/api/event/${slug}/guests`)
      // Ignore stale responses
      if (currentFetchId !== fetchCounterRef.current) return
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

      const productsRes = await fetch(`/api/event/${slug}/products`)
      // Ignore stale responses
      if (currentFetchId !== fetchCounterRef.current) return
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

    // Visual feedback
    setJustAdded(productId)
    setTimeout(() => setJustAdded(null), 600)

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
        // Debounced sync - prevents flickering on rapid clicks
        debouncedFetchData()
      }
    } catch (error) {
      console.error('Error adding product:', error)
      // On error, re-fetch to restore correct state
      debouncedFetchData()
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
        // Debounced sync - prevents flickering on rapid clicks
        debouncedFetchData()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      debouncedFetchData()
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

  // Check if event is currently active (today is within start_date..end_date)
  const isEventActive = (() => {
    if (!session) return false
    const now = new Date()
    // Use local date only (no time comparison)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const start = new Date(session.start_date)
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())

    if (today < startDay) return false // event hasn't started

    if (session.end_date) {
      const end = new Date(session.end_date)
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      if (today > endDay) return false // event already ended
    } else {
      // No end_date = single-day event
      if (today > startDay) return false
    }
    return true
  })()

  if (loading) {
    return <NestLoading message="Načítám občerstvení..." />
  }

  return (
    <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Občerstvení" maxWidth="max-w-7xl">

      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6">

            {/* Event not active banner */}
            {!isEventActive && session && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6 text-center">
                <div className="flex justify-center mb-3">
                  {new Date() < new Date(session.start_date)
                    ? <Clock className="w-10 h-10 text-amber-400" />
                    : <CalendarOff className="w-10 h-10 text-amber-400" />
                  }
                </div>
                <h2 className="text-lg font-bold text-amber-400 mb-1">
                  {new Date() < new Date(session.start_date)
                    ? 'Akce ještě nezačala'
                    : 'Akce už skončila'
                  }
                </h2>
                <p className="text-sm text-[var(--nest-text-secondary)]">
                  {new Date() < new Date(session.start_date)
                    ? `Občerstvení bude dostupné od ${formatDate(session.start_date)}${session.end_date ? ` do ${formatDate(session.end_date)}` : ''}.`
                    : 'Občerstvení již není možné objednávat.'
                  }
                </p>
                <p className="text-xs text-[var(--nest-text-tertiary)] mt-2">
                  Evidenci konzumace lze provádět pouze v průběhu akce.
                </p>
              </div>
            )}
            {guests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--nest-white-60)] text-sm mb-4">Zatím nejsou žádní hosté</p>
                <Link
                  href={`/event/${slug}/register`}
                  className="text-[var(--nest-yellow)] hover:underline font-semibold text-sm"
                >
                  Zaregistruj se na akci
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  {/* TOP 3 Leaderboard - only shown when no custom TOP Challenge products are set */}
                  {guests.length > 0 && !(session?.top_products && session.top_products.length > 0) && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {/* Top Eaters */}
                      <div className="nest-card p-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Trophy className="w-4 h-4 text-[var(--nest-yellow)]" />
                          <h3 className="text-sm font-bold">TOP Jedlíci</h3>
                        </div>
                        <div className="space-y-1">
                          {topEaters.map((guest, index) => (
                            <div key={guest.id} className="bg-[var(--nest-dark-3)] rounded p-1.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                                <span className="font-semibold truncate text-xs">{guest.name}</span>
                              </div>
                              <span className="font-bold text-[var(--nest-yellow)] whitespace-nowrap ml-1">{guest.totalItems}×</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Beer Drinkers */}
                      <div className="nest-card p-3">
                        <div className="flex items-center gap-1 mb-2">
                          <Beer className="w-4 h-4 text-[var(--nest-info)]" />
                          <h3 className="text-sm font-bold">TOP Pivaři</h3>
                        </div>
                        <div className="space-y-1">
                          {topBeerDrinkers.length > 0 ? (
                            topBeerDrinkers.map((guest, index) => (
                              <div key={guest.id} className="bg-[var(--nest-dark-3)] rounded p-1.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                                  <span className="font-semibold truncate text-xs">{guest.name}</span>
                                </div>
                                <span className="font-bold text-[var(--nest-info)] whitespace-nowrap ml-1">{guest.totalBeers}×</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[var(--nest-white-40)] text-center py-1 text-xs">Zatím nikdo 😢</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TOP Challenge Leaderboards */}
                  {session?.top_products && session.top_products.length > 0 && (() => {
                    // Build per-product leaderboards from all guests' consumption
                    const topProductIds = session.top_products
                    const topLeaderboards = topProductIds.map(productId => {
                      const product = products.find(p => p.id === productId)
                      if (!product) return null

                      // Calculate total consumption per guest for this product
                      const guestTotals = guests
                        .map(guest => {
                          const qty = guest.consumption
                            .filter(c => c.products.id === productId)
                            .reduce((sum, c) => sum + c.quantity, 0)
                          return { guest, qty }
                        })
                        .filter(g => g.qty > 0)
                        .sort((a, b) => b.qty - a.qty)
                        .slice(0, 5)

                      return { product, guestTotals }
                    }).filter(Boolean) as Array<{ product: Product; guestTotals: Array<{ guest: GuestWithConsumption; qty: number }> }>

                    if (topLeaderboards.length === 0) return null

                    return (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Trophy className="w-4 h-4 text-[var(--nest-yellow)]" />
                          <h3 className="text-sm font-bold">🔥 TOP Challenge</h3>
                        </div>
                        <div className="space-y-3">
                          {topLeaderboards.map(({ product, guestTotals }) => (
                            <div
                              key={product.id}
                              className="rounded-xl overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.05))',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                              }}
                            >
                              <div className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                <span className="text-sm font-bold text-[var(--nest-yellow)]">{product.name}</span>
                              </div>
                              <div className="px-3 py-2 space-y-1">
                                {guestTotals.length > 0 ? (
                                  guestTotals.map((entry, idx) => (
                                    <div
                                      key={entry.guest.id}
                                      className="flex items-center justify-between py-1 text-xs"
                                      style={{
                                        borderLeft: idx === 0 ? '2px solid #f59e0b' : 'none',
                                        paddingLeft: idx === 0 ? '8px' : '10px',
                                      }}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm">
                                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                                        </span>
                                        <span className={`font-semibold ${idx === 0 ? 'text-[var(--nest-yellow)]' : ''}`}>
                                          {entry.guest.name}
                                        </span>
                                      </div>
                                      <span className={`font-bold ${idx === 0 ? 'text-[var(--nest-yellow)]' : 'text-[var(--nest-white-60)]'}`}>
                                        {entry.qty}×
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[var(--nest-white-40)] text-center py-1 text-xs">Zatím nikdo 🤷</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  <h2 className="text-base font-bold mb-3">Hosté</h2>
                  <div className="space-y-2">
                    {guests.map((guest) => (
                      <button
                        key={guest.id}
                        onClick={() => {
                          setSelectedGuest(guest)
                        }}
                        className={`w-full text-left p-3 rounded-xl font-semibold transition-all text-sm ${selectedGuest?.id === guest.id
                          ? 'bg-[var(--nest-yellow)] text-[var(--nest-dark)] shadow-lg'
                          : 'nest-card hover:border-[var(--nest-yellow)]/30'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{guest.name}</span>
                          {guest.totalPrice > 0 && (
                            <span className="text-sm font-normal">
                              {guest.totalPrice.toFixed(0)} Kč
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {!selectedGuest ? (
                    <div className="nest-card-elevated p-8 text-center">
                      <p className="text-sm text-[var(--nest-white-60)]">Vyber si hosta ze seznamu →</p>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/30 rounded-xl p-4 mb-6">
                        <p className="text-[var(--nest-white-60)] text-xs mb-1">Vybíráš pro:</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-bold text-[var(--nest-yellow)]">{selectedGuest.name}</p>
                          <button
                            onClick={() => {
                              setSelectedGuest(null)
                            }}
                            className="inline-flex items-center gap-2 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-dark)] px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                          >
                            Hotovo ✓
                          </button>
                        </div>
                        {selectedGuest.consumption.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-orange-300">
                            <p className="text-[var(--nest-white-60)] text-xs mb-3 font-semibold">Zatím koupeno:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from(
                                selectedGuest.consumption.reduce((acc, item) => {
                                  const key = item.products.id
                                  if (!acc.has(key)) {
                                    acc.set(key, { ...item, totalQuantity: 0, ids: [] as string[] })
                                  }
                                  const grouped = acc.get(key)!
                                  grouped.totalQuantity += item.quantity
                                  grouped.ids.push(item.id)
                                  return acc
                                }, new Map<string, any>()).values()
                              )
                                .sort((a, b) => (a.products.category || '').localeCompare(b.products.category || ''))
                                .map((grouped) => (
                                  <div key={grouped.products.id} className="flex items-center justify-between bg-[var(--nest-dark-3)] rounded-lg p-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-[var(--nest-white-40)]">{grouped.products.category}</p>
                                      <p className="font-medium text-sm">{grouped.products.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button
                                        onClick={() => isEventActive && handleDeleteProduct(grouped.ids[grouped.ids.length - 1])}
                                        disabled={!isEventActive}
                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--nest-error)]/15 text-[var(--nest-error)] hover:bg-[var(--nest-error)]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <span className="w-8 text-center font-bold">{grouped.totalQuantity}</span>
                                      <button
                                        onClick={() => isEventActive && handleAddProduct(grouped.products.id)}
                                        disabled={!isEventActive}
                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--nest-success)]/15 text-[var(--nest-success)] hover:bg-[var(--nest-success)]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <h2 className="text-base font-bold mb-3">Pochutiny - Klikni a přidej!</h2>
                      {products.length === 0 ? (
                        <p className="text-[var(--nest-white-60)] text-sm">Zatím žádné pochutiny nejsou k dispozici</p>
                      ) : (() => {
                        // Get IDs of products the guest already consumed
                        const consumedProductIds = new Set(
                          selectedGuest.consumption.map(c => c.products.id)
                        )
                        const favoriteProducts = products.filter(p => consumedProductIds.has(p.id))

                        // Build category list for filter
                        const categories = Array.from(
                          products.reduce((acc, product) => {
                            const category = product.category || 'Ostatní'
                            if (!acc.has(category)) {
                              acc.set(category, 0)
                            }
                            acc.set(category, acc.get(category)! + 1)
                            return acc
                          }, new Map<string, number>()).entries()
                        ).sort(([catA], [catB]) => {
                          const order = ['Pivo', 'Nealko', 'Sladkosti', 'Jídlo', 'Alkoholické nápoje']
                          const iA = order.findIndex(o => catA.toLowerCase().startsWith(o.toLowerCase()))
                          const iB = order.findIndex(o => catB.toLowerCase().startsWith(o.toLowerCase()))
                          return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB)
                        })

                        // Filter products based on selected category
                        const filteredProducts = selectedCategory
                          ? products.filter(p => (p.category || 'Ostatní') === selectedCategory)
                          : products

                        const renderProductCard = (product: Product) => (
                          <button
                            key={product.id}
                            onClick={() => isEventActive && handleAddProduct(product.id)}
                            disabled={!isEventActive}
                            className={`relative rounded-xl p-4 text-center transition-all transform ${!isEventActive ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'} ${justAdded === product.id
                              ? 'bg-[var(--nest-success)] text-[var(--nest-dark)] shadow-xl scale-105'
                              : 'nest-card hover:border-[var(--nest-yellow)]/30'
                              }`}
                          >
                            <div
                              className="rounded-lg mb-3 flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: '#ffffff', height: 140 }}
                            >
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 12 }}
                                />
                              ) : (
                                <span className="text-4xl">🍽️</span>
                              )}
                            </div>
                            <p className="font-semibold text-sm mb-1">{product.name}</p>
                            <p className={`font-bold text-sm ${justAdded === product.id ? 'text-[var(--nest-dark)]' : 'text-[var(--nest-yellow)]'
                              }`}>
                              {product.price} Kč
                            </p>
                            {justAdded === product.id && (
                              <div className="absolute inset-0 flex items-center justify-center text-5xl">
                                ✓
                              </div>
                            )}
                          </button>
                        )

                        // Emoji map for categories
                        const categoryEmoji: Record<string, string> = {
                          'Pivo': '🍺',
                          'Alkoholické nápoje': '🥃',
                          'Nealkoholické nápoje': '🥤',
                          'Nealko': '🥤',
                          'Jídlo': '🍕',
                          'Sladkosti': '🍬',
                          'Ostatní': '📦',
                        }

                        return (
                          <div className="space-y-4">
                            {/* Category filter - square tile buttons for tablet */}
                            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(100px, 1fr))` }}>
                              <button
                                onClick={() => setSelectedCategory(null)}
                                className={`flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 ${selectedCategory === null
                                  ? 'bg-[var(--nest-yellow)] text-[var(--nest-dark)] shadow-lg shadow-[var(--nest-yellow)]/20'
                                  : 'bg-[var(--nest-dark-3)] text-[var(--nest-white-60)] hover:bg-[var(--nest-dark-4)]'
                                  }`}
                                style={{ aspectRatio: '1', minHeight: 100 }}
                              >
                                <span className="text-4xl mb-1">🍽️</span>
                                <span className="text-xs font-bold leading-tight">Vše</span>
                                <span className="text-[10px] opacity-70">{products.length}</span>
                              </button>
                              {categories.map(([category, count]) => (
                                <button
                                  key={category}
                                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                                  className={`flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 ${selectedCategory === category
                                    ? 'bg-[var(--nest-yellow)] text-[var(--nest-dark)] shadow-lg shadow-[var(--nest-yellow)]/20'
                                    : 'bg-[var(--nest-dark-3)] text-[var(--nest-white-60)] hover:bg-[var(--nest-dark-4)]'
                                    }`}
                                  style={{ aspectRatio: '1', minHeight: 100 }}
                                >
                                  <span className="text-4xl mb-1">{categoryEmoji[category] || '📦'}</span>
                                  <span className="text-xs font-bold leading-tight text-center px-1 truncate w-full">{category}</span>
                                  <span className="text-[10px] opacity-70">{count}</span>
                                </button>
                              ))}
                            </div>

                            {/* Moje oblíbené - cross-event favorites for authenticated users */}
                            {!selectedCategory && isAuthenticated && userFavorites.length > 0 && (() => {
                              const availableFavIds = new Set(products.map(p => p.id))
                              const crossEventFavs = userFavorites.filter(f => availableFavIds.has(f.product_id))
                              if (crossEventFavs.length === 0) return null
                              return (
                                <div>
                                  <h3 className="text-sm font-bold mb-3 pb-2 border-b border-pink-500/30 flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-pink-400" />
                                    <span className="text-pink-300">Moje oblíbené</span>
                                    <span className="text-[10px] font-normal text-pink-400/60">ze všech eventů</span>
                                  </h3>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {crossEventFavs.map(fav => {
                                      const product = products.find(p => p.id === fav.product_id)
                                      if (!product) return null
                                      return renderProductCard(product)
                                    })}
                                  </div>
                                </div>
                              )
                            })()}

                            {/* Oblíbené - already consumed products (only when showing all) */}
                            {!selectedCategory && favoriteProducts.length > 0 && (
                              <div>
                                <h3 className="text-sm font-bold mb-3 pb-2 border-b border-[var(--nest-yellow)]/30 flex items-center gap-2">
                                  ⭐ Oblíbené
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {favoriteProducts.map(renderProductCard)}
                                </div>
                              </div>
                            )}

                            {/* Products - filtered or grouped by category */}
                            {selectedCategory ? (
                              // When a category is selected, show flat grid
                              <div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {filteredProducts.map(renderProductCard)}
                                </div>
                              </div>
                            ) : (
                              // When showing all, group by category
                              Array.from(
                                products.reduce((acc, product) => {
                                  const category = product.category || 'Ostatní'
                                  if (!acc.has(category)) {
                                    acc.set(category, [])
                                  }
                                  acc.get(category)!.push(product)
                                  return acc
                                }, new Map<string, typeof products>()).entries()
                              )
                                .sort(([catA], [catB]) => {
                                  const order = ['Pivo', 'Nealko', 'Sladkosti', 'Jídlo', 'Alkoholické nápoje']
                                  const iA = order.findIndex(o => catA.toLowerCase().startsWith(o.toLowerCase()))
                                  const iB = order.findIndex(o => catB.toLowerCase().startsWith(o.toLowerCase()))
                                  return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB)
                                })
                                .map(([category, categoryProducts]) => (
                                  <div key={category}>
                                    <h3 className="text-sm font-bold mb-3 pb-2 border-b border-[var(--nest-dark-4)]">
                                      {category}
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                      {categoryProducts.map(renderProductCard)}
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


    </NestPage>
  )
}