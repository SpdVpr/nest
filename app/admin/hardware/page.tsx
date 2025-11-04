'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Monitor, Cpu, Save, X } from 'lucide-react'

interface HardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc'
  category: string
  price_per_night: number
  is_available: boolean
}

interface EditingItem extends Partial<HardwareItem> {
  id?: string
}

export default function AdminHardwarePage() {
  const router = useRouter()
  const [items, setItems] = useState<HardwareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)

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
      category: '',
      price_per_night: 100,
      is_available: true,
    })
  }

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
                    value={editingItem.type || 'monitor'}
                    onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as 'monitor' | 'pc' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    <option value="monitor">Monitor</option>
                    <option value="pc">PC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie *
                  </label>
                  <input
                    type="text"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="např. Premium 24&quot; 144Hz"
                  />
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
                  />
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

        {/* Hardware List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Název
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kategorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cena/noc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Zatím žádné HW položky. Klikni na "Přidat HW" pro vytvoření první.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {item.type === 'monitor' ? (
                        <Monitor className="w-6 h-6 text-orange-600" />
                      ) : (
                        <Cpu className="w-6 h-6 text-purple-600" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-700">{item.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-orange-600">{item.price_per_night} Kč</p>
                    </td>
                    <td className="px-6 py-4">
                      {item.is_available ? (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Dostupné
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Nedostupné
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}