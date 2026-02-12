'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, ShoppingCart, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Product, Guest } from '@/types/database.types'
import { formatPrice } from '@/lib/utils'

export default function GuestProductsPage() {
  const params = useParams()
  const guestId = params.id as string
  
  const [guest, setGuest] = useState<Guest | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addingProduct, setAddingProduct] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [guestId])

  const fetchData = async () => {
    try {
      // Fetch guest
      const guestRes = await fetch('/api/guests')
      const guestData = await guestRes.json()
      const foundGuest = guestData.guests.find((g: Guest) => g.id === guestId)
      setGuest(foundGuest || null)

      // Fetch products
      const productsRes = await fetch('/api/products')
      const productsData = await productsRes.json()
      setProducts(productsData.products || [])

      // Fetch consumption to calculate total
      const consumptionRes = await fetch(`/api/consumption?guest_id=${guestId}`)
      const consumptionData = await consumptionRes.json()
      
      const total = consumptionData.consumption?.reduce((sum: number, item: any) => {
        return sum + (item.products?.price || 0) * item.quantity
      }, 0) || 0
      
      setTotalSpent(total)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (productId: string, price: number) => {
    setAddingProduct(productId)
    
    try {
      const response = await fetch('/api/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId,
          product_id: productId,
          quantity: 1,
        }),
      })

      if (!response.ok) throw new Error('Failed to add product')

      // Update total
      setTotalSpent(prev => prev + price)
      
      // Optional: Show success feedback
      // You could add a toast notification here
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Nepodařilo se přidat produkt')
    } finally {
      setAddingProduct(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!guest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Host nenalezen</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/select-guest"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Zpět
            </Link>

            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-gray-900">{guest.name}</h1>
              <div className="flex items-center justify-center mt-1">
                <ShoppingCart className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-lg font-semibold text-blue-600">
                  {formatPrice(totalSpent)}
                </span>
              </div>
            </div>

            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Vyber si produkty
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Momentálně nejsou k dispozici žádné produkty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingCart className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-lg font-bold text-blue-600 mb-2">
                    {formatPrice(product.price)}
                  </p>

                  {/* Add Button */}
                  <button
                    onClick={() => handleAddProduct(product.id, product.price)}
                    disabled={addingProduct === product.id}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {addingProduct === product.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Přidat
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}