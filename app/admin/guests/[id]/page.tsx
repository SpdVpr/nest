'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  ShoppingCart,
  DollarSign,
  Calendar,
  TrendingUp,
  Award,
  Loader2,
  Monitor,
  Home,
  CreditCard
} from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'

interface GuestDetail {
  id: string
  name: string
  session_id: string
  created_at: string
  nights_count: number
  check_in_date: string | null
  check_out_date: string | null
  session: {
    id: string
    name: string
    start_date: string
    end_date: string | null
    price_per_night: number
  }
  totalItems: number
  totalBeers: number
  totalPrice: number
  accommodationCost: number
  hardwareCost: number
  consumption: Array<{
    id: string
    quantity: number
    consumed_at: string
    product: {
      id: string
      name: string
      price: number
      category: string | null
      image_url: string | null
    }
  }>
  categoryBreakdown: Array<{
    category: string
    count: number
    total: number
  }>
  hardwareReservations: Array<{
    id: string
    hardware_item_id: string
    quantity: number
    nights_count: number
    total_price: number
    status: string
    notes: string | null
    created_at: string
    hardware_item: {
      id: string
      name: string
      type: string
      category: string
      price_per_night: number
      specs: any
    }
  }>
}

export default function GuestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const guestId = params.id as string

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState<GuestDetail | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchGuestDetail()
    }
  }, [router, guestId])

  const fetchGuestDetail = async () => {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch guest detail')
      }

      const data = await response.json()
      setGuest(data.guest)
    } catch (error) {
      console.error('Error fetching guest:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Host nenalezen</h1>
          <Link href="/admin/guests" className="text-blue-600 hover:text-blue-700">
            Zpět na hosty
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/admin/guests"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zpět na hosty
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{guest.name}</h1>
              <p className="text-gray-600">
                {guest.session.name} • {formatDate(guest.session.start_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="w-6 h-6" />
              <span className="text-2xl font-bold">{guest.totalItems}×</span>
            </div>
            <p className="text-blue-100 font-medium text-sm">Jídlo & Pití</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-6 h-6" />
              <span className="text-2xl font-bold">{guest.totalBeers}×</span>
            </div>
            <p className="text-amber-100 font-medium text-sm">Piv vypito</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Home className="w-6 h-6" />
              <span className="text-2xl font-bold">{guest.nights_count}×</span>
            </div>
            <p className="text-purple-100 font-medium text-sm">Noci ubytování</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Monitor className="w-6 h-6" />
              <span className="text-2xl font-bold">{guest.hardwareReservations.length}</span>
            </div>
            <p className="text-green-100 font-medium text-sm">HW rezervace</p>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl shadow-lg p-6 mb-8 text-white">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Finanční přehled
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-slate-200 text-sm mb-1">Jídlo & Pití</p>
              <p className="text-2xl font-bold">{formatPrice(guest.totalPrice)}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-slate-200 text-sm mb-1">Ubytování</p>
              <p className="text-2xl font-bold">{formatPrice(guest.accommodationCost)}</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-slate-200 text-sm mb-1">Hardware</p>
              <p className="text-2xl font-bold">{formatPrice(guest.hardwareCost)}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 border border-white border-opacity-30">
              <p className="text-slate-100 text-sm mb-1 font-semibold">Celkem</p>
              <p className="text-3xl font-bold">
                {formatPrice(guest.totalPrice + guest.accommodationCost + guest.hardwareCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Consumption History */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Historie spotřeby
            </h2>

            {guest.consumption.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Zatím žádná spotřeba</p>
            ) : (
              <div className="space-y-3">
                {guest.consumption.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {item.product.image_url && (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {item.quantity}× {item.product.name}
                            </h3>
                            {item.product.category && (
                              <p className="text-sm text-gray-500">{item.product.category}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.consumed_at).toLocaleString('cs-CZ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Breakdown & Info */}
          <div className="space-y-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Podle kategorií
              </h2>

              {guest.categoryBreakdown.length === 0 ? (
                <p className="text-gray-500 text-sm">Žádná data</p>
              ) : (
                <div className="space-y-3">
                  {guest.categoryBreakdown.map((cat) => (
                    <div key={cat.category} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{cat.category}</span>
                        <span className="text-sm text-gray-600">{cat.count}×</span>
                      </div>
                      <p className="text-sm font-semibold text-blue-600">
                        {formatPrice(cat.total)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accommodation Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Home className="w-5 h-5 text-purple-600" />
                Ubytování
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Počet nocí:</span>
                  <p className="font-medium text-gray-900">{guest.nights_count}×</p>
                </div>
                {guest.check_in_date && (
                  <div>
                    <span className="text-gray-600">Příjezd:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(guest.check_in_date).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                )}
                {guest.check_out_date && (
                  <div>
                    <span className="text-gray-600">Odjezd:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(guest.check_out_date).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t border-purple-200">
                  <span className="text-gray-600">Cena ubytování:</span>
                  <p className="font-bold text-purple-600">{formatPrice(guest.accommodationCost)}</p>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Informace
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Registrován:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(guest.created_at).toLocaleString('cs-CZ')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Event:</span>
                  <p className="font-medium text-gray-900">{guest.session.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Reservations */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Monitor className="w-6 h-6" />
              Hardware
            </h2>

            {guest.hardwareReservations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Žádné HW rezervace</p>
            ) : (
              <div className="space-y-3">
                {guest.hardwareReservations.map((hw) => (
                  <div
                    key={hw.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{hw.quantity > 1 ? `${hw.quantity}× ` : ''}{hw.hardware_item.name}</h3>
                        <p className="text-xs text-gray-500">
                          {hw.hardware_item.type === 'monitor' ? '🖥️ Monitor' : '💻 PC'} • {hw.hardware_item.category}
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                        {hw.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{hw.nights_count}× noc{hw.nights_count !== 1 ? 'í' : ''}</span>
                      <p className="font-bold text-green-600">{formatPrice(hw.total_price)}</p>
                    </div>
                    {hw.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">Poznámka: {hw.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}