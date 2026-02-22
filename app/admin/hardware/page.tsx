'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Monitor, Cpu, Save, X, Gamepad2, Keyboard, Mouse, Headphones, Cable, Copy, GripVertical } from 'lucide-react'

interface HardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity: number
  is_available: boolean
  is_top?: boolean
  sort_order?: number
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
  const [savingOrder, setSavingOrder] = useState(false)

  // Drag & Drop state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

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
      is_top: item.is_top,
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

  // Drag & Drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index
    setDraggedIdx(index)
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDraggedIdx(null)
      return
    }

    const reordered = [...displayItems]
    const [draggedItemEl] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, draggedItemEl)

    // Assign sort_order based on new position
    const updatedItems = reordered.map((item, idx) => ({ ...item, sort_order: idx }))

    // Update local state immediately for responsiveness
    setItems(prevItems => {
      const newItems = [...prevItems]
      updatedItems.forEach(updated => {
        const existingIdx = newItems.findIndex(i => i.id === updated.id)
        if (existingIdx !== -1) {
          newItems[existingIdx] = { ...newItems[existingIdx], sort_order: updated.sort_order }
        }
      })
      return newItems
    })

    dragItem.current = null
    dragOverItem.current = null
    setDraggedIdx(null)

    // Save to backend
    setSavingOrder(true)
    try {
      const token = localStorage.getItem('admin_token')
      await fetch('/api/admin/hardware/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: updatedItems.map(item => ({ id: item.id, sort_order: item.sort_order }))
        }),
      })
    } catch (error) {
      console.error('Error saving order:', error)
    } finally {
      setSavingOrder(false)
    }
  }

  // Total items count (sum of quantities)
  const totalItemsCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

  // Filter and sort items based on active tab
  const displayItems: HardwareItem[] = activeTab === 'all'
    ? [...items].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    : items.filter(item => typeToCategory(item.type) === activeTab).sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))

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
              <h1 className="text-3xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>💻 Správa Hardware</h1>
              <p className="mt-1" style={{ color: 'var(--nest-text-secondary)' }}>
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
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <p className="text-sm" style={{ color: '#60a5fa' }}>
            ⚠️ <strong>Změny se projeví okamžitě ve všech eventech!</strong> Tento seznam je sdílený
            pro všechny LAN party. Každý model má nastavený počet kusů (ks).
          </p>
        </div>

        {/* Tabs */}
        <div className="rounded-xl shadow-sm p-2 mb-6" style={{ backgroundColor: 'var(--nest-surface)' }}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                : ''
                }`}
              style={activeTab !== 'all' ? { color: 'var(--nest-text-secondary)' } : {}}
            >
              Vše ({items.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTab(category)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === category
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : ''
                  }`}
                style={activeTab !== category ? { color: 'var(--nest-text-secondary)' } : {}}
              >
                {category} ({itemsByCategory[category]?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Editing Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="rounded-2xl shadow-xl p-8 max-w-md w-full" style={{ backgroundColor: 'var(--nest-surface)' }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--nest-text-primary)' }}>
                {isCreating ? 'Nová HW položka' : 'Upravit HW položku'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                    Název *
                  </label>
                  <input
                    type="text"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                    placeholder='např. Monitor 24" Samsung'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
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
                    className="w-full px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                  >
                    <option value="monitor">📺 Monitor</option>
                    <option value="pc">💻 PC</option>
                    <option value="accessory">🎮 Příslušenství</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                      Cena za noc (Kč) *
                    </label>
                    <input
                      type="number"
                      value={editingItem.price_per_night ?? ''}
                      onChange={(e) => setEditingItem({ ...editingItem, price_per_night: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      min="0"
                    />
                    {editingItem.type === 'accessory' && (
                      <p className="text-xs mt-1" style={{ color: 'var(--nest-text-tertiary)' }}>Příslušenství je obvykle zdarma</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>
                      Počet kusů *
                    </label>
                    <input
                      type="number"
                      value={editingItem.quantity ?? ''}
                      onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                      min="1"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--nest-text-tertiary)' }}>Kolik fyzických kusů máš k dispozici</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>Dostupné pro rezervace</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingItem.is_top === true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_top: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>⭐ Označit jako TOP (prémiový produkt)</label>
                </div>

                {/* Monitor specs */}
                {editingItem.type === 'monitor' && (
                  <div style={{ borderTop: '1px solid var(--nest-border)', paddingTop: '1rem' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--nest-text-secondary)' }}>📺 Specifikace monitoru</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>Úhlopříčka</label>
                        <input
                          type="text"
                          value={editingItem.specs?.diagonal || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, diagonal: e.target.value } })}
                          className="w-full px-4 py-2 rounded-lg"
                          style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                          placeholder='např. 24"'
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>Obnovovací frekvence</label>
                        <input
                          type="text"
                          value={editingItem.specs?.hz || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, hz: e.target.value } })}
                          className="w-full px-4 py-2 rounded-lg"
                          style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                          placeholder='např. 144 Hz'
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>Rozlišení</label>
                        <input
                          type="text"
                          value={editingItem.specs?.resolution || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, resolution: e.target.value } })}
                          className="w-full px-4 py-2 rounded-lg"
                          style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                          placeholder='např. 1920×1080'
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PC specs */}
                {editingItem.type === 'pc' && (
                  <div style={{ borderTop: '1px solid var(--nest-border)', paddingTop: '1rem' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--nest-text-secondary)' }}>💻 Specifikace PC</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>Procesor</label>
                          <input
                            type="text"
                            value={editingItem.specs?.cpu || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, cpu: e.target.value } })}
                            className="w-full px-4 py-2 rounded-lg"
                            style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                            placeholder='např. Intel i5-12400F'
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>Paměť</label>
                          <input
                            type="text"
                            value={editingItem.specs?.ram || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, ram: e.target.value } })}
                            className="w-full px-4 py-2 rounded-lg"
                            style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                            placeholder='např. 16 GB DDR4'
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nest-text-secondary)' }}>Grafická karta</label>
                        <input
                          type="text"
                          value={editingItem.specs?.gpu || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, specs: { ...editingItem.specs, gpu: e.target.value } })}
                          className="w-full px-4 py-2 rounded-lg"
                          style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
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
                  className="flex-1 px-6 py-3 rounded-xl font-semibold"
                  style={{ border: '2px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
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

        {/* Hardware List - Drag & Drop Sortable */}
        {displayItems.length === 0 ? (
          <div className="rounded-xl shadow-sm p-8 text-center" style={{ backgroundColor: 'var(--nest-surface)' }}>
            <p style={{ color: 'var(--nest-text-secondary)' }}>
              Zatím žádné HW položky. Klikni na &quot;Přidat HW&quot; pro vytvoření první.
            </p>
          </div>
        ) : (
          <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)' }}>
            <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #ea580c, #dc2626)' }}>
              <h2 className="text-xl font-bold text-white">
                Technika ({displayItems.length} modelů)
              </h2>
              <div className="flex items-center gap-3">
                {savingOrder && (
                  <span className="text-white/70 text-xs animate-pulse">Ukládám pořadí...</span>
                )}
                <span className="text-white/80 text-sm font-medium">
                  {totalItemsCount} ks celkem
                </span>
              </div>
            </div>
            <p className="px-6 py-2 text-xs" style={{ color: 'var(--nest-text-tertiary)', borderBottom: '1px solid var(--nest-border)' }}>
              ⠿ Přetáhni položky pro změnu pořadí — toto pořadí uvidí i hosté při rezervaci
            </p>
            <div>
              {displayItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-4 transition-all"
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--nest-border)',
                    opacity: draggedIdx === index ? 0.4 : 1,
                    cursor: 'grab',
                    backgroundColor: draggedIdx === index ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                  }}
                >
                  {/* Drag Handle */}
                  <div className="flex-shrink-0 cursor-grab active:cursor-grabbing" style={{ color: 'var(--nest-text-tertiary)' }}>
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Order number */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' }}>
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getItemIcon(item, "w-7 h-7")}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg" style={{ color: 'var(--nest-text-primary)' }}>
                      {item.is_top && <span style={{ color: '#f59e0b' }}>★ </span>}
                      {item.name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
                      {item.type === 'monitor' ? '📺 Monitor' : item.type === 'pc' ? '💻 PC' : '🎮 Příslušenství'}
                      {formatSpecs(item.specs) && ` • ${formatSpecs(item.specs)}`}
                    </p>
                  </div>

                  {/* Quantity badge */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                      {item.quantity || 1} ks
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 text-right">
                    <p className="font-bold text-xl" style={{ color: '#fb923c' }}>
                      {item.price_per_night === 0 ? 'Zdarma' : `${item.price_per_night} Kč/noc`}
                    </p>
                    {item.is_available ? (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold mt-1" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                        Dostupné
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold mt-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                        Nedostupné
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDuplicate(item)}
                      className="p-2 rounded-lg transition"
                      style={{ color: 'var(--nest-text-tertiary)' }}
                      title="Duplikovat"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 rounded-lg transition"
                      style={{ color: '#60a5fa' }}
                      title="Upravit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
        )}
      </div>
    </div>
  )
}