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

const CATEGORY_EMOJI: Record<string, string> = {
  'Pivo': '🍺',
  'Alkoholické nápoje': '🥃',
  'Nealkoholické nápoje': '🥤',
  'Jídlo': '🍕',
  'Sladkosti': '🍬',
  'Ostatní': '📦',
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

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
      category: 'Ostatní',
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

  const categories = ['Pivo', 'Alkoholické nápoje', 'Nealkoholické nápoje', 'Jídlo', 'Sladkosti', 'Ostatní']

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    const cat = product.category || 'Ostatní'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  // Sort products within each category by name
  Object.values(productsByCategory).forEach(items => items.sort((a, b) => a.name.localeCompare(b.name)))

  const existingCategories = categories.filter(cat => productsByCategory[cat]?.length > 0)

  // Filter based on active tab
  const displayCategories = activeTab === 'all' ? existingCategories : existingCategories.filter(cat => cat === activeTab)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg)' }}>
        <p style={{ color: 'var(--nest-text-secondary)' }}>Načítám...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 mb-4"
            style={{ color: 'var(--nest-text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Zpět na dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>🍕 Správa Produktů</h1>
              <p className="mt-1" style={{ color: 'var(--nest-text-secondary)' }}>
                {products.length} produktů • Centrální seznam občerstvení pro všechny eventy
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
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
          <div className="flex items-start justify-between">
            <p className="text-sm" style={{ color: '#c084fc' }}>
              ⚠️ <strong>Změny se projeví okamžitě ve všech eventech!</strong> Tento seznam je sdílený
              pro všechny LAN party. Pokud upravíš nebo smažeš produkt, změna ovlivní i už založené eventy.
            </p>
            <button
              onClick={handleSyncProducts}
              disabled={syncing}
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm whitespace-nowrap transition-colors"
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

        {/* Category Tabs */}
        <div className="rounded-xl shadow-sm p-2 mb-6" style={{ backgroundColor: 'var(--nest-surface)' }}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'all'
                ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
                : ''
                }`}
              style={activeTab !== 'all' ? { color: 'var(--nest-text-secondary)' } : {}}
            >
              Vše ({products.length})
            </button>
            {existingCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === category
                  ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
                  : ''
                  }`}
                style={activeTab !== category ? { color: 'var(--nest-text-secondary)' } : {}}
              >
                {CATEGORY_EMOJI[category] || '📦'} {category} ({productsByCategory[category]?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Editing Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="rounded-2xl shadow-xl p-8 max-w-2xl w-full my-8" style={{ backgroundColor: 'var(--nest-surface)' }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--nest-text-primary)' }}>
                {isCreating ? 'Nový produkt' : 'Upravit produkt'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                    Název *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                    placeholder="např. Coca Cola 0.5l"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                    Cena (Kč) *
                  </label>
                  <input
                    type="number"
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                    Kategorie
                  </label>
                  <select
                    value={editingProduct.category || 'Ostatní'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_EMOJI[cat] || '📦'} {cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                    Obrázek
                  </label>
                  {editingProduct.image_url && (
                    <div className="mb-3 rounded-lg p-3 flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '1px solid var(--nest-border)' }}>
                      <img
                        src={editingProduct.image_url}
                        alt="Náhled"
                        className="max-w-xs max-h-48 object-contain rounded-lg"
                      />
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition" style={{ borderColor: 'var(--nest-border)', color: 'var(--nest-text-secondary)' }}>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#c084fc' }} />
                        <span className="text-sm" style={{ color: '#c084fc' }}>Nahrávám...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Klikni pro nahrání obrázku</span>
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
                  <label className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>Dostupné</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingProduct(null)
                    setIsCreating(false)
                  }}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold"
                  style={{ border: '2px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
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

        {/* Products List - Grouped by Category */}
        {products.length === 0 ? (
          <div className="rounded-xl shadow-sm p-8 text-center" style={{ backgroundColor: 'var(--nest-surface)' }}>
            <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--nest-text-tertiary)' }} />
            <p style={{ color: 'var(--nest-text-secondary)' }}>
              Zatím žádné produkty. Klikni na &quot;Přidat produkt&quot; pro vytvoření prvního.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayCategories.map((category) => {
              const categoryProducts = productsByCategory[category] || []
              return (
                <div key={category} className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)' }}>
                  <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #9333ea, #7c3aed)' }}>
                    <h2 className="text-xl font-bold text-white">
                      {CATEGORY_EMOJI[category] || '📦'} {category} ({categoryProducts.length})
                    </h2>
                  </div>
                  <div>
                    {categoryProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 transition-colors"
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderBottom: '1px solid var(--nest-border)',
                        }}
                      >
                        {/* Product image */}
                        {product.image_url ? (
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)' }}>
                            <Package className="w-8 h-8" style={{ color: '#c084fc' }} />
                          </div>
                        )}

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg" style={{ color: 'var(--nest-text-primary)' }}>{product.name}</p>
                        </div>

                        {/* Availability */}
                        <div className="flex-shrink-0">
                          {product.is_available ? (
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                              Dostupné
                            </span>
                          ) : (
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                              Nedostupné
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex-shrink-0 text-right" style={{ minWidth: '80px' }}>
                          <p className="font-bold text-xl" style={{ color: '#c084fc' }}>
                            {product.price} Kč
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex gap-1">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 rounded-lg transition"
                            style={{ color: '#60a5fa' }}
                            title="Upravit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 rounded-lg transition"
                            style={{ color: '#f87171' }}
                            title="Smazat"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}