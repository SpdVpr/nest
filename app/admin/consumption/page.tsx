'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, CalendarDays, Loader2, Package, ReceiptText, Search, Tags, Trophy, UserRound, Users } from 'lucide-react'

interface ConsumptionRecord {
  id: string
  guest_id: string
  product_id: string
  quantity: number
  session_id: string
  consumed_at: string
  unit_price?: number
  products?: {
    name: string
    price: number
    category: string | null
  } | null
  guest?: {
    name: string
  } | null
  session?: {
    name: string
  } | null
}

interface AggregateRow {
  id: string
  name: string
  quantity: number
  revenue: number
  records: number
  secondary?: string
}

export default function AdminConsumptionPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [records, setRecords] = useState<ConsumptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }

    setIsAuthenticated(true)
    fetchConsumption(token)
  }, [router])

  const fetchConsumption = async (token: string) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/admin/consumption', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Nepodařilo se načíst historii spotřeby')
      }

      const data = await response.json()
      setRecords(data.records || [])
    } catch (err) {
      console.error('Error fetching consumption:', err)
      setError(err instanceof Error ? err.message : 'Nepodařilo se načíst historii spotřeby')
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return records

    return records.filter(record => {
      const haystack = [
        record.guest?.name,
        record.session?.name,
        record.products?.name,
        record.products?.category,
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [records, search])

  const stats = useMemo(() => {
    const totalItems = filteredRecords.reduce((sum, record) => sum + (record.quantity || 0), 0)
    const totalRevenue = filteredRecords.reduce((sum, record) => {
      const unitPrice = record.unit_price ?? record.products?.price ?? 0
      return sum + unitPrice * (record.quantity || 0)
    }, 0)
    const uniqueGuests = new Set(filteredRecords.map(record => record.guest_id)).size
    const uniqueEvents = new Set(filteredRecords.map(record => record.session_id)).size

    return {
      totalItems,
      totalRevenue,
      uniqueGuests,
      uniqueEvents,
      recordsCount: filteredRecords.length,
      avgRevenuePerEvent: uniqueEvents > 0 ? totalRevenue / uniqueEvents : 0,
      avgItemsPerEvent: uniqueEvents > 0 ? totalItems / uniqueEvents : 0,
      avgRevenuePerGuest: uniqueGuests > 0 ? totalRevenue / uniqueGuests : 0,
      avgItemsPerGuest: uniqueGuests > 0 ? totalItems / uniqueGuests : 0,
    }
  }, [filteredRecords])

  const analytics = useMemo(() => {
    const productsMap = new Map<string, AggregateRow>()
    const eventsMap = new Map<string, AggregateRow>()
    const guestsMap = new Map<string, AggregateRow>()
    const categoriesMap = new Map<string, AggregateRow>()

    filteredRecords.forEach(record => {
      const quantity = record.quantity || 0
      const unitPrice = record.unit_price ?? record.products?.price ?? 0
      const revenue = quantity * unitPrice

      const productId = record.product_id || 'unknown-product'
      const product = productsMap.get(productId) || {
        id: productId,
        name: record.products?.name || 'Neznámý produkt',
        secondary: record.products?.category || 'Bez kategorie',
        quantity: 0,
        revenue: 0,
        records: 0,
      }
      product.quantity += quantity
      product.revenue += revenue
      product.records += 1
      productsMap.set(productId, product)

      const eventId = record.session_id || 'unknown-session'
      const event = eventsMap.get(eventId) || {
        id: eventId,
        name: record.session?.name || 'Neznámá akce',
        quantity: 0,
        revenue: 0,
        records: 0,
      }
      event.quantity += quantity
      event.revenue += revenue
      event.records += 1
      eventsMap.set(eventId, event)

      const guestId = record.guest_id || 'unknown-guest'
      const guest = guestsMap.get(guestId) || {
        id: guestId,
        name: record.guest?.name || 'Neznámý host',
        quantity: 0,
        revenue: 0,
        records: 0,
      }
      guest.quantity += quantity
      guest.revenue += revenue
      guest.records += 1
      guestsMap.set(guestId, guest)

      const categoryName = record.products?.category || 'Bez kategorie'
      const category = categoriesMap.get(categoryName) || {
        id: categoryName,
        name: categoryName,
        quantity: 0,
        revenue: 0,
        records: 0,
      }
      category.quantity += quantity
      category.revenue += revenue
      category.records += 1
      categoriesMap.set(categoryName, category)
    })

    const byRevenue = (a: AggregateRow, b: AggregateRow) => b.revenue - a.revenue
    const byQuantity = (a: AggregateRow, b: AggregateRow) => b.quantity - a.quantity

    return {
      topProductsByRevenue: Array.from(productsMap.values()).sort(byRevenue).slice(0, 6),
      topProductsByQuantity: Array.from(productsMap.values()).sort(byQuantity).slice(0, 6),
      topEvents: Array.from(eventsMap.values()).sort(byRevenue).slice(0, 6),
      topGuests: Array.from(guestsMap.values()).sort(byRevenue).slice(0, 6),
      categories: Array.from(categoriesMap.values()).sort(byRevenue).slice(0, 6),
    }
  }, [filteredRecords])

  const formatDateTime = (value: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderRankList = (items: AggregateRow[], emptyText: string, showSecondary = false) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {showSecondary && item.secondary ? `${item.secondary} · ` : ''}
                  {item.quantity.toLocaleString('cs-CZ')} ks
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-gray-900">{item.revenue.toLocaleString('cs-CZ')} Kč</p>
            </div>
          </div>
        ))
      )}
    </div>
  )

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#efefef] shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historie spotřeby</h1>
              <p className="text-sm text-gray-500 mt-1">Přehled všech nákupů napříč akcemi</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hledat hosta, akci nebo produkt..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="bg-[#efefef] rounded-xl shadow p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Načítám historii spotřeby...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <ReceiptText className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-xs text-gray-500 uppercase font-medium">Záznamů</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recordsCount.toLocaleString('cs-CZ')}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <Package className="w-5 h-5 text-orange-600 mb-2" />
                <p className="text-xs text-gray-500 uppercase font-medium">Kusů celkem</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems.toLocaleString('cs-CZ')}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <UserRound className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-xs text-gray-500 uppercase font-medium">Hostů</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueGuests.toLocaleString('cs-CZ')}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <CalendarDays className="w-5 h-5 text-purple-600 mb-2" />
                <p className="text-xs text-gray-500 uppercase font-medium">Tržba</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString('cs-CZ')} Kč</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <BarChart3 className="w-5 h-5 text-blue-700 mb-2" />
                <p className="text-xs text-blue-700 uppercase font-medium">Průměr za event</p>
                <p className="text-2xl font-bold text-blue-900">{stats.avgRevenuePerEvent.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč</p>
                <p className="text-xs text-blue-600">{stats.avgItemsPerEvent.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} ks / event</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <Users className="w-5 h-5 text-emerald-700 mb-2" />
                <p className="text-xs text-emerald-700 uppercase font-medium">Průměr na hosta</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.avgRevenuePerGuest.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč</p>
                <p className="text-xs text-emerald-600">{stats.avgItemsPerGuest.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} ks / host</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <Trophy className="w-5 h-5 text-orange-700 mb-2" />
                <p className="text-xs text-orange-700 uppercase font-medium">Nejprodávanější</p>
                <p className="text-xl font-bold text-orange-900 truncate">{analytics.topProductsByQuantity[0]?.name || '-'}</p>
                <p className="text-xs text-orange-600">{(analytics.topProductsByQuantity[0]?.quantity || 0).toLocaleString('cs-CZ')} ks</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <Tags className="w-5 h-5 text-purple-700 mb-2" />
                <p className="text-xs text-purple-700 uppercase font-medium">Top kategorie</p>
                <p className="text-xl font-bold text-purple-900 truncate">{analytics.categories[0]?.name || '-'}</p>
                <p className="text-xs text-purple-600">{(analytics.categories[0]?.revenue || 0).toLocaleString('cs-CZ')} Kč</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <h2 className="font-bold text-gray-900">TOP produkty podle tržby</h2>
                </div>
                {renderRankList(analytics.topProductsByRevenue, 'Zatím žádné produkty.', true)}
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-orange-600" />
                  <h2 className="font-bold text-gray-900">TOP produkty podle kusů</h2>
                </div>
                {renderRankList(analytics.topProductsByQuantity, 'Zatím žádné produkty.', true)}
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-gray-900">Spotřeba podle eventů</h2>
                </div>
                {renderRankList(analytics.topEvents, 'Zatím žádné eventy.')}
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserRound className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-gray-900">Největší spotřebitelé</h2>
                </div>
                {renderRankList(analytics.topGuests, 'Zatím žádní hosté.')}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tags className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-gray-900">Kategorie podle tržby</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {analytics.categories.length === 0 ? (
                  <p className="text-sm text-gray-400">Zatím žádné kategorie.</p>
                ) : (
                  analytics.categories.map(category => {
                    const pct = stats.totalRevenue > 0 ? (category.revenue / stats.totalRevenue) * 100 : 0
                    return (
                      <div key={category.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="font-semibold text-gray-900 truncate">{category.name}</p>
                          <p className="text-sm font-bold text-gray-900">{category.revenue.toLocaleString('cs-CZ')} Kč</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {category.quantity.toLocaleString('cs-CZ')} ks · {pct.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} % tržby
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              {filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  {records.length === 0 ? 'Zatím tu není žádná spotřeba.' : 'Nic neodpovídá hledání.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Čas</th>
                        <th className="text-left px-4 py-3 font-semibold">Host</th>
                        <th className="text-left px-4 py-3 font-semibold">Akce</th>
                        <th className="text-left px-4 py-3 font-semibold">Produkt</th>
                        <th className="text-right px-4 py-3 font-semibold">Ks</th>
                        <th className="text-right px-4 py-3 font-semibold">Cena</th>
                        <th className="text-right px-4 py-3 font-semibold">Celkem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.map(record => {
                        const unitPrice = record.unit_price ?? record.products?.price ?? 0
                        const total = unitPrice * (record.quantity || 0)

                        return (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(record.consumed_at)}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{record.guest?.name || 'Neznámý host'}</td>
                            <td className="px-4 py-3 text-gray-600">{record.session?.name || 'Neznámá akce'}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{record.products?.name || 'Neznámý produkt'}</div>
                              {record.products?.category && (
                                <div className="text-xs text-gray-400">{record.products.category}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-700">{record.quantity || 0}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{unitPrice.toLocaleString('cs-CZ')} Kč</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{total.toLocaleString('cs-CZ')} Kč</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
