'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Monitor, Cpu, Save, X, Gamepad2, Keyboard, Mouse, Headphones, Cable } from 'lucide-react'

interface HardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  is_available: boolean
}

interface EditingItem extends Partial<HardwareItem> {
  id?: string
}

// Helper function to get icon based on item name
const getItemIcon = (item: HardwareItem, className: string = "w-8 h-8") => {
  const name = item.name.toLowerCase()

  if (item.type === 'pc') {
    return <Cpu className={`${className} text-purple-600`} />
  } else if (item.type === 'monitor') {
    return <Monitor className={`${className} text-orange-600`} />
  } else if (item.type === 'accessory') {
    // Check name for specific accessories
    if (name.includes('klávesnic')) {
      return <Keyboard className={`${className} text-blue-600`} />
    } else if (name.includes('myš')) {
      return <Mouse className={`${className} text-green-600`} />
    } else if (name.includes('sluchátk')) {
      return <Headphones className={`${className} text-purple-600`} />
    } else if (name.includes('kabel') || name.includes('napájec')) {
      return <Cable className={`${className} text-yellow-600`} />
    } else {
      return <Gamepad2 className={`${className} text-orange-600`} />
    }
  }

  return <Gamepad2 className={`${className} text-orange-600`} />
}

export default function AdminHardwarePage() {
  const router = useRouter()
  const [items, setItems] = useState<HardwareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      fetchItems()
    }
  }, [router])

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/hardware', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching hardware:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingItem({
      name: '',
      type: 'accessory',
      category: 'Příslušenství',
      price_per_night: 0,
      is_available: true,
    })
  }

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'Ostatní'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, HardwareItem[]>)

  const categories = Object.keys(itemsByCategory).sort()

  // Filter items based on active tab
  const filteredCategories = activeTab === 'all'
    ? categories
    : categories.filter(cat => cat === activeTab)

  const handleEdit = (item: HardwareItem) => {
    setIsCreating(false)
    setEditingItem({ ...item })
  }

  const handleSave = async () => {
    if (!editingItem) return

    try {
      const token = localStorage.getItem('admin_token')
      const url = isCreating
        ? '/api/admin/hardware'
        : `/api/admin/hardware/${editingItem.id}`
      
      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingItem),
      })

      if (response.ok) {
        setEditingItem(null)
        setIsCreating(false)
        fetchItems()
      } else {
        alert('Chyba při ukládání')
      }
    } catch (error) {
      console.error('Error saving hardware:', error)
      alert('Chyba při ukládání')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu smazat tuto položku? Změna se projeví ve všech eventech!')) return

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/hardware/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchItems()
      } else {
        alert('Chyba při mazání')
      }
    } catch (error) {
      console.error('Error deleting hardware:', error)
      alert('Chyba při mazání')
    }
  }

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
              <h1 className="text-3xl font-bold text-gray-900">💻 Správa Hardware</h1>
              <p className="text-gray-600 mt-1">
                Centrální seznam HW pro všechny eventy
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              Přidat HW
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-900 text-sm">
            ⚠️ <strong>Změny se projeví okamžitě ve všech eventech!</strong> Tento seznam je sdílený
            pro všechny LAN party. Pokud upravíš nebo smažeš položku, změna ovlivní i už založené eventy.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Vše ({items.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  activeTab === category
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category} ({itemsByCategory[category].length})
              </button>
            ))}
          </div>
        </div>

        {/* Editing Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isCreating ? 'Nová HW položka' : 'Upravit HW položku'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Název *
                  </label>
                  <input
                    type="text"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="např. Monitor 24&quot; Samsung"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ *
                  </label>
                  <select
                    value={editingItem.type || 'accessory'}
                    onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as 'monitor' | 'pc' | 'accessory' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="monitor">📺 Monitor</option>
                    <option value="pc">💻 PC</option>
                    <option value="accessory">🎮 Příslušenství</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie *
                  </label>
                  <select
                    value={editingItem.category || 'Příslušenství'}
                    onChange={(e) => {
                      const category = e.target.value
                      setEditingItem({
                        ...editingItem,
                        category,
                        price_per_night: category === 'Příslušenství' ? 0 : editingItem.price_per_night
                      })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="Příslušenství">Příslušenství (zdarma)</option>
                    <option value="Premium 24&quot; 144Hz">Premium 24&quot; 144Hz</option>
                    <option value="Standard 24&quot; 60Hz">Standard 24&quot; 60Hz</option>
                    <option value="Gaming PC">Gaming PC</option>
                    <option value="Office PC">Office PC</option>
                    <option value="Ostatní">Ostatní</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cena za noc (Kč) *
                  </label>
                  <input
                    type="number"
                    value={editingItem.price_per_night || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, price_per_night: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    min="0"
                    disabled={editingItem.category === 'Příslušenství'}
                  />
                  {editingItem.category === 'Příslušenství' && (
                    <p className="text-xs text-gray-500 mt-1">Příslušenství je vždy zdarma</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-700">Dostupné</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setIsCreating(false)
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 text-gray-900"
                >
                  <X className="w-5 h-5 inline mr-2" />
                  Zrušit
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold"
                >
                  <Save className="w-5 h-5 inline mr-2" />
                  Uložit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hardware List - Grouped by Category */}
        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">
              Zatím žádné HW položky. Klikni na &quot;Přidat HW&quot; pro vytvoření první.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3">
                  <h2 className="text-xl font-bold text-white">
                    {category} ({itemsByCategory[category].length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {itemsByCategory[category].map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {getItemIcon(item, "w-8 h-8")}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.type === 'monitor' ? '📺 Monitor' : item.type === 'pc' ? '💻 PC' : '🎮 Příslušenství'}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-orange-600 text-xl">
                          {item.price_per_night === 0 ? 'Zdarma' : `${item.price_per_night} Kč/noc`}
                        </p>
                        {item.is_available ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mt-1">
                            Dostupné
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 mt-1">
                            Nedostupné
                          </span>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}