'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Trophy, Beer, Zap, Candy, GlassWater, Users, Loader2, RefreshCw, Edit2, Check, X } from 'lucide-react'
import { useAdminAuth } from '@/lib/admin-auth-context'
import { canEditSettings } from '@/lib/admin-roles'

interface NestRecord {
    id: string
    category: string
    group_name: string
    date: string | null
    count: number
    source?: string
    created_at: string
}

const CATEGORIES = [
    { value: 'attendance', label: '👥 Účast', icon: Users, color: '#3b82f6' },
    { value: 'pivo', label: '🍺 Pivo', icon: Beer, color: '#f59e0b' },
    { value: 'redbull', label: '⚡ Red Bull', icon: Zap, color: '#ef4444' },
    { value: 'bueno', label: '🍫 Kinder Bueno', icon: Candy, color: '#a855f7' },
    { value: 'jagermeister', label: '🦌 Jägermeister', icon: GlassWater, color: '#22c55e' },
]

export default function AdminRecordsPage() {
    const router = useRouter()
    const { adminUser, role, loading: authLoading, isApproved } = useAdminAuth()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [records, setRecords] = useState<NestRecord[]>([])
    const [loading, setLoading] = useState(true)

    // Form state
    const [newCategory, setNewCategory] = useState('attendance')
    const [newGroupName, setNewGroupName] = useState('')
    const [newDate, setNewDate] = useState('')
    const [newCount, setNewCount] = useState('')
    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editDate, setEditDate] = useState('')
    const [editCount, setEditCount] = useState('')
    const [editCategory, setEditCategory] = useState('')
    const [editSaving, setEditSaving] = useState(false)

    const showEdit = role ? canEditSettings(role) : false

    useEffect(() => {
        if (authLoading) return

        if (!adminUser) {
            const token = localStorage.getItem('admin_token')
            if (!token) {
                router.push('/admin/login')
                return
            }
        }

        if (adminUser && !isApproved) {
            router.push('/admin/login')
            return
        }

        setIsAuthenticated(true)
        fetchRecords()
    }, [adminUser, authLoading, isApproved, router])

    const fetchRecords = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/records', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setRecords(data.records || [])
            }
        } catch (error) {
            console.error('Error fetching records:', error)
        } finally {
            setLoading(false)
        }
    }

    const addRecord = async () => {
        if (!newGroupName.trim() || !newCount) return

        setSaving(true)
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: newCategory,
                    group_name: newGroupName.trim(),
                    date: newDate || null,
                    count: parseInt(newCount),
                })
            })

            if (response.ok) {
                setNewGroupName('')
                setNewDate('')
                setNewCount('')
                fetchRecords()
            } else {
                alert('Nepodařilo se přidat záznam')
            }
        } catch (error) {
            console.error('Error adding record:', error)
            alert('Chyba při přidávání záznamu')
        } finally {
            setSaving(false)
        }
    }

    const deleteRecord = async (id: string) => {
        if (!confirm('Smazat tento rekord?')) return

        try {
            const token = localStorage.getItem('admin_token')
            await fetch('/api/admin/records', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id })
            })
            fetchRecords()
        } catch (error) {
            console.error('Error deleting record:', error)
        }
    }

    const syncRecords = async () => {
        setSyncing(true)
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/records/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                fetchRecords()
                if (data.added > 0) {
                    alert(`Synchronizováno ${data.added} nových záznamů z ${data.message.match(/\d+ completed/)?.[0] || 'proběhlých'} eventů`)
                } else {
                    alert('Žádné nové záznamy k synchronizaci')
                }
            } else {
                alert('Chyba při synchronizaci')
            }
        } catch (error) {
            console.error('Error syncing records:', error)
            alert('Chyba při synchronizaci')
        } finally {
            setSyncing(false)
        }
    }

    const startEdit = (record: NestRecord) => {
        setEditingId(record.id)
        setEditName(record.group_name)
        setEditDate(record.date || '')
        setEditCount(record.count.toString())
        setEditCategory(record.category)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditDate('')
        setEditCount('')
        setEditCategory('')
    }

    const saveEdit = async () => {
        if (!editingId || !editName.trim() || !editCount) return
        setEditSaving(true)
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/records', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: editingId,
                    group_name: editName.trim(),
                    count: parseInt(editCount),
                    date: editDate || null,
                    category: editCategory,
                })
            })
            if (response.ok) {
                cancelEdit()
                fetchRecords()
            } else {
                alert('Nepodařilo se uložit změny')
            }
        } catch (error) {
            console.error('Error updating record:', error)
            alert('Chyba při ukládání')
        } finally {
            setEditSaving(false)
        }
    }

    const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0]

    if (!isAuthenticated || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // Group records by category
    const grouped: Record<string, NestRecord[]> = {}
    CATEGORIES.forEach(c => { grouped[c.value] = [] })
    records.forEach(r => {
        if (!grouped[r.category]) grouped[r.category] = []
        grouped[r.category].push(r)
    })
    // Sort within each category by count descending
    Object.values(grouped).forEach(arr => arr.sort((a, b) => b.count - a.count))

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-[#efefef] shadow">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Link
                                href="/admin/dashboard"
                                className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Dashboard
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-yellow-500" />
                                Rekordy Nestu
                            </h1>
                        </div>
                        {showEdit && (
                            <button
                                onClick={syncRecords}
                                disabled={syncing}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Synchronizuji...' : '🔄 Načíst z eventů'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Add new record form */}
                {showEdit && (
                    <div className="bg-white rounded-xl shadow p-6 mb-8">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-green-600" />
                            Přidat nový rekord
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value} className="text-gray-900 bg-white">{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Skupina / Jméno</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="např. Borci z Prahy"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Počet</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newCount}
                                    onChange={(e) => setNewCount(e.target.value)}
                                    placeholder="např. 42"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                />
                            </div>

                            <button
                                onClick={addRecord}
                                disabled={saving || !newGroupName.trim() || !newCount}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? 'Ukládám...' : '+ Přidat'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Records by category */}
                <div className="space-y-6">
                    {CATEGORIES.map(cat => {
                        const catRecords = grouped[cat.value] || []
                        const Icon = cat.icon

                        return (
                            <div key={cat.value} className="bg-white rounded-xl shadow overflow-hidden">
                                <div
                                    className="px-6 py-4 border-b flex items-center gap-3"
                                    style={{ borderColor: `${cat.color}30`, backgroundColor: `${cat.color}08` }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: cat.color }} />
                                    <h2 className="text-lg font-bold text-gray-900">{cat.label}</h2>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                        {catRecords.length} záznamů
                                    </span>
                                </div>

                                {catRecords.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-gray-400 text-sm">
                                        Zatím žádné rekordy
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {catRecords.map((record, idx) => (
                                            <div key={record.id} className="px-6 py-3 hover:bg-gray-50">
                                                {editingId === record.id ? (
                                                    /* Edit mode */
                                                    <div className="flex flex-col gap-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                            <input
                                                                type="text"
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                                placeholder="Název"
                                                                autoFocus
                                                            />
                                                            <input
                                                                type="date"
                                                                value={editDate}
                                                                onChange={(e) => setEditDate(e.target.value)}
                                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                            />
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={editCount}
                                                                onChange={(e) => setEditCount(e.target.value)}
                                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                                placeholder="Počet"
                                                            />
                                                            <select
                                                                value={editCategory}
                                                                onChange={(e) => setEditCategory(e.target.value)}
                                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                                                            >
                                                                {CATEGORIES.map(c => (
                                                                    <option key={c.value} value={c.value} className="text-gray-900 bg-white">{c.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={saveEdit}
                                                                disabled={editSaving || !editName.trim() || !editCount}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                {editSaving ? 'Ukládám...' : 'Uložit'}
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg text-sm font-medium border border-gray-300"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* View mode */
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xl flex-shrink-0 w-8 text-center">
                                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900">{record.group_name}</p>
                                                            {record.date && (
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(record.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </p>
                                                            )}
                                                            {record.source === 'auto' && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">🤖 auto</span>
                                                            )}
                                                            {!record.source && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">✍️ manuální</span>
                                                            )}
                                                        </div>
                                                        <span
                                                            className="text-lg font-bold px-3 py-1 rounded-lg"
                                                            style={{ color: cat.color, backgroundColor: `${cat.color}12` }}
                                                        >
                                                            {record.count}×
                                                        </span>
                                                        {showEdit && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => startEdit(record)}
                                                                    className="text-gray-300 hover:text-blue-500 transition-colors"
                                                                    title="Upravit"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteRecord(record.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                                    title="Smazat"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
