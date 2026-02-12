'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Monitor, Cpu, Save, X, Gamepad2, Keyboard, Mouse, Headphones, Cable, Copy } from 'lucide-react'

interface HardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity: number
  is_available: boolean
  specs?: {
    diagonal?: string
    hz?: string
    resolution?: string
    cpu?: string
    gpu?: string
    ram?: string
  }
}

interface EditingItem extends Partial<HardwareItem> {
  id?: string
  specs?: {
    diagonal?: string
    hz?: string
    resolution?: string
    cpu?: string
    gpu?: string
    ram?: string
  }
}

// Helper function to get icon based on item name
const getItemIcon = (item: HardwareItem, className: string = "w-8 h-8") => {
  const name = item.name.toLowerCase()

  if (item.type === 'pc') {
    return <Cpu className={`${className} text-purple-600`} />
  } else if (item.type === 'monitor') {
    return <Monitor className={`${className} text-orange-600`} />
  } else if (item.type === 'accessory') {
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

const formatSpecs = (specs?: { diagonal?: string; hz?: string; resolution?: string; cpu?: string; gpu?: string; ram?: string }): string => {
  if (!specs) return ''
  const parts: string[] = []
  if (specs.diagonal) parts.push(`${specs.diagonal}${specs.diagonal.includes('"') || specs.diagonal.includes('″') ? '' : '"'}`)
  if (specs.hz) parts.push(`${specs.hz}${specs.hz.toLowerCase().includes('hz') ? '' : ' Hz'}`)
  if (specs.resolution) parts.push(`${specs.resolution}`)
  if (specs.cpu) parts.push(`CPU: ${specs.cpu}`)
  if (specs.ram) parts.push(`RAM: ${specs.ram}`)
  if (specs.gpu) parts.push(`GPU: ${specs.gpu}`)
  return parts.join(' • ')
}

export default function AdminHardwarePage() {
  const router = useRouter()
  const [items, setItems] = useState<HardwareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  const typeToCategory = (type: string) => {
    switch (type) {
      case 'monitor': return 'Monitory'
      case 'pc': return 'Počítače'
      case 'accessory': return 'Příslušenství'
      default: return 'Ostatní'
    }
  }

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
      type: 'monitor',
      category: 'Monitory',
      price_per_night: undefined,
      quantity: 1,
      is_available: true,
    })
  }

  // Group items by type
  const itemsByCategory = items.reduce((acc, item) => {
    const category = typeToCategory(item.type)
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
    setEditingItem({ ...item, specs: item.specs || {} })
  }

  const handleDuplicate = (item: HardwareItem) => {
    setIsCreating(true)
    setEditingItem({
      name: item.name + ' (kopie)',
      type: item.type,
      category: item.category,
      price_per_night: item.price_per_night,
      quantity: item.quantity,
      is_available: item.is_available,
      specs: item.specs ? { ...item.specs } : {},
    })
  }

  const handleSave = async () => {
    if (!editingItem) return

    try {
      const token = localStorage.getItem('admin_token')
      const url = isCreating
        ? '/api/admin/hardware'
        : `/api/admin/hardware/${editingItem.id}`

      const saveData = {
        ...editingItem,
        category: typeToCategory(editingItem.type || 'accessory'),
        price_per_night: editingItem.price_per_night ?? 0,
        quantity: editingItem.quantity ?? 1,
      }

      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saveData),
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

  // Total items count (sum of quantities)
  const totalItemsCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

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
                {items.length} modelů • {totalItemsCount} ks celkem
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
            pro všechny LAN party. Každý model má nastavený počet kusů (ks).
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'all'
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
                className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === category
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
                    placeholder='např. Monitor 24" Samsung'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ *
                  </label>
                  <select
                    value={editingItem.type || 'monitor'}
                    onChange={(e) => {
                      const type = e.target.value as 'monitor' | 'pc' | 'accessory'
                      setEditingItem({
                        ...editingItem,
                        type,
                        category: typeToCategory(type),
                      })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="monitor">📺 Monitor</option>
                    <option value="pc">💻 PC</option>
                    <option value="accessory">🎮 Příslušenství</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cena za noc (Kč) *
                    </label>
                    <input
                      type="number"
                      value={editingItem.price_per_night ?? ''}
                      onChange={(e) => setEditingItem({ ...editingItem, price_per_night: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      min="0"
                    />
                    {editingItem.type === 'accessory' && (
                      <p className="text-xs text-gray-500 mt-1">Příslušenství je obvykle zdarma</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Počet kusů *
                    </label>
                    <input
                      type="number"
                      value={editingItem.quantity ?? ''}
                      onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Kolik fyzických kusů máš k dispozici</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-700">Dostupné pro rezervace</label>
                </div>

                {/* Monitor specs */}
                {editingItem.type === 'monitor' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📺 Specifikace monitoru</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Úhlopříčka</label>
                        <input
                          type="text"
                          value={editingItem.specs?.diagonal || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, diagonal: e.target.value } })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder='např. 24"'
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Obnovovací frekvence</label>
                        <input
                          type="text"
                          value={editingItem.specs?.hz || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, hz: e.target.value } })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder='např. 144 Hz'
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rozlišení</label>
                        <input
                          type="text"
                          value={editingItem.specs?.resolution || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, resolution: e.target.value } })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder='např. 1920×1080'
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PC specs */}
                {editingItem.type === 'pc' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">💻 Specifikace PC</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Procesor</label>
                          <input
                            type="text"
                            value={editingItem.specs?.cpu || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, cpu: e.target.value } })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                            placeholder='např. Intel i5-12400F'
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Paměť</label>
                          <input
                            type="text"
                            value={editingItem.specs?.ram || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, ram: e.target.value } })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                            placeholder='např. 16 GB DDR4'
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grafická karta</label>
                        <input
                          type="text"
                          value={editingItem.specs?.gpu || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, gpu: e.target.value } })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                          placeholder='např. RTX 4060'
                        />
                      </div>
                    </div>
                  </div>
                )}
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
            {filteredCategories.map((category) => {
              const categoryQty = itemsByCategory[category].reduce((sum, item) => sum + (item.quantity || 1), 0)
              return (
                <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                      {category} ({itemsByCategory[category].length} modelů)
                    </h2>
                    <span className="text-white/80 text-sm font-medium">
                      {categoryQty} ks celkem
                    </span>
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
                            {formatSpecs(item.specs) && ` • ${formatSpecs(item.specs)}`}
                          </p>
                        </div>

                        {/* Quantity badge */}
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                            {item.quantity || 1} ks
                          </span>
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

                        <div className="flex-shrink-0 flex gap-1">
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title="Duplikovat"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Upravit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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