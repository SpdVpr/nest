'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Package, Upload, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  category: string
  image_url?: string
  is_available: boolean
}

interface EditingProduct extends Partial<Product> {
  id?: string
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      fetchProducts()
    }
  }, [router])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingProduct({
      name: '',
      price: 0,
      category: 'Nápoje',
      image_url: '',
      is_available: true,
    })
  }

  const handleEdit = (product: Product) => {
    setIsCreating(false)
    setEditingProduct({ ...product })
  }

  const handleSave = async () => {
    if (!editingProduct || !editingProduct.name || editingProduct.price === undefined) {
      alert('Vyplň název a cenu')
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const url = isCreating
        ? '/api/admin/products'
        : `/api/admin/products/${editingProduct.id}`
      
      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      })

      if (response.ok) {
        setEditingProduct(null)
        setIsCreating(false)
        fetchProducts()
      } else {
        alert('Chyba při ukládání')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Chyba při ukládání')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat tento produkt? Změna se projeví ve všech eventech!')) return

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchProducts()
      } else {
        alert('Chyba při mazání')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Chyba při mazání')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setEditingProduct({ ...editingProduct, image_url: data.url })
      } else {
        alert('Chyba při nahrávání obrázku')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Chyba při nahrávání obrázku')
    } finally {
      setUploading(false)
    }
  }

  const handleSyncProducts = async () => {
    setSyncing(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Produkty synchronizovány! Přidáno ${data.synced_count} položek.`)
      } else {
        alert('❌ Chyba při synchronizaci')
      }
    } catch (error) {
      console.error('Error syncing products:', error)
      alert('❌ Chyba při synchronizaci')
    } finally {
      setSyncing(false)
    }
  }

  const categories = ['Nápoje', 'Jídlo', 'Sladkosti', 'Ostatní']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Načítám...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Zpět na dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🍕 Správa Produktů</h1>
              <p className="text-gray-600 mt-1">
                Centrální seznam občerstvení pro všechny eventy
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              Přidat produkt
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start justify-between">
            <p className="text-blue-900 text-sm">
              ⚠️ <strong>Změny se projeví okamžitě ve všech eventech!</strong> Tento seznam je sdílený
              pro všechny LAN party. Pokud upravíš nebo smažeš produkt, změna ovlivní i už založené eventy.
            </p>
            <button
              onClick={handleSyncProducts}
              disabled={syncing}
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm whitespace-nowrap transition-colors"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synchronizuji...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Přidat ke všem eventům
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editing Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isCreating ? 'Nový produkt' : 'Upravit produkt'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Název *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="např. Coca Cola 0.5l"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cena (Kč) *
                  </label>
                  <input
                    type="number"
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={editingProduct.category || 'Nápoje'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obrázek
                  </label>
                  {editingProduct.image_url && (
                    <div className="mb-3">
                      <img
                        src={editingProduct.image_url}
                        alt="Náhled"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition">
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-purple-600">Nahrávám...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Klikni pro nahrání obrázku</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_available !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_available: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-700">Dostupné</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingProduct(null)
                    setIsCreating(false)
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 text-gray-900"
                >
                  <X className="w-5 h-5 inline mr-2" />
                  Zrušit
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
                >
                  <Save className="w-5 h-5 inline mr-2" />
                  Uložit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Zatím žádné produkty. Klikni na &quot;Přidat produkt&quot; pro vytvoření prvního.
              </p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="font-bold text-lg text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                <p className="text-2xl font-bold text-purple-600 mb-3">{product.price} Kč</p>
                
                {!product.is_available && (
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 mb-3">
                    Nedostupné
                  </span>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-semibold"
                  >
                    <Edit2 className="w-4 h-4" />
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}