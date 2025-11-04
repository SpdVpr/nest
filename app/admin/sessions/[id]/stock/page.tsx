'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, X } from 'lucide-react'
import { Session } from '@/types/database.types'
import { formatDate } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  category: string
  image_url?: string
  is_available: boolean
}

interface StockItem {
  id: string
  session_id: string
  product_id: string
  initial_quantity: number
  consumed_quantity: number
  remaining_quantity: number
  products: Product
}

export default function SessionStockPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params?.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [stock, setStock] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchData()
    }
  }, [sessionId, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')

      const sessionRes = await fetch(`/api/admin/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setSession(data.session)
      }

      const stockRes = await fetch(`/api/admin/sessions/${sessionId}/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (stockRes.ok) {
        const data = await stockRes.json()
        setStock(data.stock || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncProducts = async () => {
    try {
      setSyncing(true)
      const token = localStorage.getItem('admin_token')

      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        await fetchData()
      } else {
        const errorData = await response.json()
        console.error('Sync error:', errorData)
        alert(`Chyba při synchronizaci: ${errorData.error || 'Neznámá chyba'}`)
      }
    } catch (error) {
      console.error('Error syncing products:', error)
      alert(`Chyba: ${error instanceof Error ? error.message : 'Neznámá chyba'}`)
    } finally {
      setSyncing(false)
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
          <Link href="/admin/sessions" className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na seznam
          </Link>
          <p className="text-gray-600">Event nenalezen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href={`/admin/sessions/${sessionId}`}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zpět na event
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Správa Pochutinů</h1>
          <p className="text-gray-600 mt-1">
            {session.name} - {formatDate(session.start_date)}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-900 text-sm">
            ℹ️ Všechny dostupné produkty se automaticky přidávají k eventu. Zde vidíš jejich spotřebu.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Produkty v eventu ({stock.length})
            </h2>
            {stock.length === 0 && (
              <button
                onClick={handleSyncProducts}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Synchronizovat produkty
              </button>
            )}
          </div>

          {stock.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">Žádné produkty zatím nejsou přidány</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {stock.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {item.products.image_url && (
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.products.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.products.category}</p>
                      <p className="text-sm text-purple-600 font-medium mt-1">{item.products.price} Kč</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Spotřebováno</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{item.consumed_quantity}×</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
