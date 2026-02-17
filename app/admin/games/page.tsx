'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, X, Save, Edit2, Gamepad2, Search } from 'lucide-react'

const GAME_CATEGORIES = [
    'FPS',
    'RTS',
    'MOBA',
    'Racing',
    'Sport',
    'Party',
    'Sandbox',
    'RPG',
    'Survival',
    'Puzzle',
    'Ostatní',
]

interface GameLibraryItem {
    id: string
    name: string
    category?: string | null
    max_players?: number | null
    notes?: string | null
    is_available: boolean
    created_at: string
    updated_at: string
}

interface EditingGame {
    id?: string
    name: string
    category: string
    max_players: string
    notes: string
}

export default function AdminGamesPage() {
    const router = useRouter()
    const [games, setGames] = useState<GameLibraryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [editingGame, setEditingGame] = useState<EditingGame | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [activeCategory, setActiveCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
        } else {
            fetchGames()
        }
    }, [router])

    const fetchGames = async () => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/games', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setGames(data.games || [])
            }
        } catch (error) {
            console.error('Error fetching games:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setIsCreating(true)
        setEditingGame({
            name: '',
            category: '',
            max_players: '',
            notes: '',
        })
    }

    const handleEdit = (game: GameLibraryItem) => {
        setIsCreating(false)
        setEditingGame({
            id: game.id,
            name: game.name,
            category: game.category || '',
            max_players: game.max_players?.toString() || '',
            notes: game.notes || '',
        })
    }

    const handleSave = async () => {
        if (!editingGame || !editingGame.name.trim()) {
            alert('Název hry je povinný')
            return
        }

        setSaving(true)
        try {
            const token = localStorage.getItem('admin_token')

            if (isCreating) {
                const response = await fetch('/api/admin/games', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: editingGame.name.trim(),
                        category: editingGame.category || null,
                        max_players: editingGame.max_players ? parseInt(editingGame.max_players) : null,
                        notes: editingGame.notes || null,
                    }),
                })

                if (!response.ok) {
                    alert('Chyba při ukládání')
                    return
                }
            } else {
                const response = await fetch('/api/admin/games', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: editingGame.id,
                        name: editingGame.name.trim(),
                        category: editingGame.category || null,
                        max_players: editingGame.max_players ? parseInt(editingGame.max_players) : null,
                        notes: editingGame.notes || null,
                    }),
                })

                if (!response.ok) {
                    alert('Chyba při ukládání')
                    return
                }
            }

            setEditingGame(null)
            setIsCreating(false)
            fetchGames()
        } catch (error) {
            console.error('Error saving game:', error)
            alert('Chyba při ukládání')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Opravdu smazat hru "${name}"?`)) return

        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch(`/api/admin/games?id=${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })

            if (response.ok) {
                fetchGames()
            } else {
                alert('Chyba při mazání')
            }
        } catch (error) {
            console.error('Error deleting game:', error)
            alert('Chyba při mazání')
        }
    }

    const toggleAvailability = async (game: GameLibraryItem) => {
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/games', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id: game.id,
                    is_available: !game.is_available,
                }),
            })

            if (response.ok) {
                fetchGames()
            }
        } catch (error) {
            console.error('Error toggling availability:', error)
        }
    }

    // Group by category
    const categoriesInUse = [...new Set(games.map(g => g.category || 'Ostatní'))].sort()

    // Filter games
    const filteredGames = games.filter(game => {
        const matchesCategory = activeCategory === 'all' || (game.category || 'Ostatní') === activeCategory
        const matchesSearch = !searchQuery || game.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    const getCategoryIcon = (cat?: string | null) => {
        switch (cat) {
            case 'FPS': return '🔫'
            case 'RTS': return '🏰'
            case 'MOBA': return '⚔️'
            case 'Racing': return '🏎️'
            case 'Sport': return '⚽'
            case 'Party': return '🎉'
            case 'Sandbox': return '🧱'
            case 'RPG': return '🗡️'
            case 'Survival': return '🏕️'
            case 'Puzzle': return '🧩'
            default: return '🎮'
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
                            <h1 className="text-3xl font-bold text-gray-900">🎮 Správa her</h1>
                            <p className="text-gray-600 mt-1">
                                {games.length} her v databázi • {games.filter(g => g.is_available).length} dostupných
                            </p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            Přidat hru
                        </button>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
                    <p className="text-violet-900 text-sm">
                        🎮 <strong>Centrální databáze her.</strong> Zde spravujete hry, které je možné nainstalovat na PC při rezervaci.
                        Hry z tohoto seznamu se zobrazují hostům u eventů.
                    </p>
                </div>

                {/* Search + Categories */}
                <div className="bg-[#efefef] rounded-xl shadow-sm p-4 mb-6 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Vyhledat hru..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${activeCategory === 'all'
                                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            Vše ({games.length})
                        </button>
                        {categoriesInUse.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${activeCategory === cat
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {getCategoryIcon(cat)} {cat} ({games.filter(g => (g.category || 'Ostatní') === cat).length})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editing / Create Modal */}
                {editingGame && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-[#efefef] rounded-2xl shadow-xl p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                {isCreating ? '➕ Nová hra' : '✏️ Upravit hru'}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Název hry *
                                    </label>
                                    <input
                                        type="text"
                                        value={editingGame.name}
                                        onChange={(e) => setEditingGame({ ...editingGame, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                        placeholder="např. Counter-Strike 2"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Kategorie
                                    </label>
                                    <select
                                        value={editingGame.category}
                                        onChange={(e) => setEditingGame({ ...editingGame, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                    >
                                        <option value="">— Vybrat kategorii —</option>
                                        {GAME_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max hráčů (LAN)
                                    </label>
                                    <input
                                        type="number"
                                        value={editingGame.max_players}
                                        onChange={(e) => setEditingGame({ ...editingGame, max_players: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                        placeholder="např. 10"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Poznámky
                                    </label>
                                    <textarea
                                        value={editingGame.notes}
                                        onChange={(e) => setEditingGame({ ...editingGame, notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                        placeholder="Velikost instalace, požadavky, Steam/Epic..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setEditingGame(null)
                                        setIsCreating(false)
                                    }}
                                    disabled={saving}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 text-gray-900"
                                >
                                    <X className="w-5 h-5 inline mr-2" />
                                    Zrušit
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editingGame.name.trim()}
                                    className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white rounded-xl font-semibold"
                                >
                                    <Save className="w-5 h-5 inline mr-2" />
                                    {saving ? 'Ukládám...' : 'Uložit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Games List */}
                {filteredGames.length === 0 ? (
                    <div className="bg-[#efefef] rounded-xl shadow-sm p-8 text-center">
                        {games.length === 0 ? (
                            <div>
                                <Gamepad2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg font-medium mb-2">Zatím žádné hry v databázi</p>
                                <p className="text-gray-400 text-sm mb-4">Klikni na &quot;Přidat hru&quot; pro vytvoření první.</p>
                                <button
                                    onClick={handleCreate}
                                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold"
                                >
                                    <Plus className="w-5 h-5" />
                                    Přidat první hru
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-500">Žádné hry neodpovídají filtru.</p>
                        )}
                    </div>
                ) : (
                    <div className="bg-[#efefef] rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                🎮 Hry ({filteredGames.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {filteredGames.map((game) => (
                                <div key={game.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-xl">
                                        {getCategoryIcon(game.category)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-lg">{game.name}</p>
                                        <div className="flex flex-wrap gap-2 mt-0.5">
                                            {game.category && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                                                    {game.category}
                                                </span>
                                            )}
                                            {game.max_players && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                                    👥 max {game.max_players} hráčů
                                                </span>
                                            )}
                                            {game.notes && (
                                                <span className="text-xs text-gray-500 italic truncate max-w-[200px]">
                                                    {game.notes}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Availability badge */}
                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => toggleAvailability(game)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${game.is_available
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                }`}
                                        >
                                            {game.is_available ? '✅ Dostupná' : '❌ Nedostupná'}
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex-shrink-0 flex gap-1">
                                        <button
                                            onClick={() => handleEdit(game)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Upravit"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(game.id, game.name)}
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
                )}
            </div>
        </div>
    )
}
