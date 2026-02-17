'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, UtensilsCrossed, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface MealTemplate {
    id: string
    name: string
    allergens: string[]
    category: string
    created_at: string
}

const ALLERGEN_OPTIONS = [
    { value: 'gluten', label: 'Lepek', emoji: '🌾', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { value: 'dairy', label: 'Mléko', emoji: '🥛', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'eggs', label: 'Vejce', emoji: '🥚', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'nuts', label: 'Ořechy', emoji: '🥜', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { value: 'peanuts', label: 'Arašídy', emoji: '🫘', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { value: 'soy', label: 'Sója', emoji: '🫛', color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'fish', label: 'Ryby', emoji: '🐟', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    { value: 'shellfish', label: 'Korýši', emoji: '🦐', color: 'bg-red-100 text-red-800 border-red-300' },
    { value: 'celery', label: 'Celer', emoji: '🥬', color: 'bg-lime-100 text-lime-800 border-lime-300' },
    { value: 'mustard', label: 'Hořčice', emoji: '🟡', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'sesame', label: 'Sezam', emoji: '⚪', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    { value: 'sulfites', label: 'Oxid siřičitý', emoji: '🍷', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { value: 'lupin', label: 'Vlčí bob', emoji: '🌸', color: 'bg-pink-100 text-pink-800 border-pink-300' },
    { value: 'molluscs', label: 'Měkkýši', emoji: '🐚', color: 'bg-teal-100 text-teal-800 border-teal-300' },
]

export default function MealsPage() {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [templates, setTemplates] = useState<MealTemplate[]>([])
    const [newName, setNewName] = useState('')
    const [newAllergens, setNewAllergens] = useState<string[]>([])
    const [adding, setAdding] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showNewAllergens, setShowNewAllergens] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
        } else {
            setIsAuthenticated(true)
            fetchTemplates()
        }
    }, [router])

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/meal-templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setTemplates(data.templates || [])
            }
        } catch (error) {
            console.error('Error fetching templates:', error)
        } finally {
            setLoading(false)
        }
    }

    const addTemplate = async () => {
        if (!newName.trim()) return
        setAdding(true)
        try {
            const token = localStorage.getItem('admin_token')
            const response = await fetch('/api/admin/meal-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName.trim(), allergens: newAllergens })
            })
            if (response.ok) {
                setNewName('')
                setNewAllergens([])
                setShowNewAllergens(false)
                fetchTemplates()
            }
        } catch (error) {
            console.error('Error adding template:', error)
        } finally {
            setAdding(false)
        }
    }

    const deleteTemplate = async (id: string, name: string) => {
        if (!confirm(`Smazat "${name}" z databáze jídel?`)) return
        try {
            const token = localStorage.getItem('admin_token')
            await fetch('/api/admin/meal-templates', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id })
            })
            if (expandedId === id) setExpandedId(null)
            fetchTemplates()
        } catch (error) {
            console.error('Error deleting template:', error)
        }
    }

    const toggleAllergen = (templateId: string | null, allergen: string) => {
        if (templateId === null) {
            // New meal form
            setNewAllergens(prev =>
                prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
            )
        } else {
            // Existing meal - update immediately
            const template = templates.find(t => t.id === templateId)
            if (!template) return
            const updatedAllergens = template.allergens.includes(allergen)
                ? template.allergens.filter(a => a !== allergen)
                : [...template.allergens, allergen]

            // Optimistic update
            setTemplates(prev => prev.map(t =>
                t.id === templateId ? { ...t, allergens: updatedAllergens } : t
            ))

            // Save to API
            const token = localStorage.getItem('admin_token')
            fetch('/api/admin/meal-templates', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id: templateId, allergens: updatedAllergens })
            }).catch(error => {
                console.error('Error updating allergens:', error)
                fetchTemplates() // revert on error
            })
        }
    }

    const getAllergenInfo = (value: string) => {
        return ALLERGEN_OPTIONS.find(a => a.value === value)
    }

    if (!isAuthenticated) return null

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-[#efefef] shadow">
                <div className="max-w-3xl mx-auto px-4 py-6">
                    <Link
                        href="/admin/dashboard"
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <UtensilsCrossed className="w-8 h-8 text-amber-500" />
                        Databáze jídel
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Sem si přidej jídla, která se točí na LAN party. Při vytváření eventu je pak jen vybereš.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Add new meal */}
                <div className="bg-[#efefef] rounded-xl shadow p-6 mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4 text-lg">Přidat nové jídlo</h2>
                    <div className="flex gap-3 mb-3">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Např. Kuřecí řízek s bramborovým salátem"
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 text-base"
                            onKeyDown={(e) => e.key === 'Enter' && !showNewAllergens && addTemplate()}
                        />
                        <button
                            onClick={addTemplate}
                            disabled={adding || !newName.trim()}
                            className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
                        >
                            {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            Přidat
                        </button>
                    </div>

                    {/* Allergen toggle for new meal */}
                    <button
                        onClick={() => setShowNewAllergens(!showNewAllergens)}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-1"
                    >
                        {showNewAllergens ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {showNewAllergens ? 'Skrýt alergeny' : '+ Přidat alergeny'}
                    </button>

                    {showNewAllergens && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {ALLERGEN_OPTIONS.map(allergen => (
                                <button
                                    key={allergen.value}
                                    onClick={() => toggleAllergen(null, allergen.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${newAllergens.includes(allergen.value)
                                            ? `${allergen.color} border-2 shadow-sm`
                                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {allergen.emoji} {allergen.label}
                                    {newAllergens.includes(allergen.value) && <Check className="w-3 h-3 inline ml-1" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Existing meals */}
                <div className="bg-[#efefef] rounded-xl shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900 text-lg">
                            Jídla v databázi
                        </h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {templates.length} jídel
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="p-12 text-center">
                            <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg font-medium">Žádná jídla v databázi</p>
                            <p className="text-gray-400 text-sm mt-1">Přidej si jídla, která se budou točit na LAN party</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {templates.map((template, index) => (
                                <div key={template.id} className="group">
                                    {/* Main row */}
                                    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div
                                            className="flex items-center gap-4 flex-1 cursor-pointer"
                                            onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                                        >
                                            <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1">
                                                <span className="text-gray-900 font-medium text-base">{template.name}</span>
                                                {/* Allergen badges inline */}
                                                {template.allergens.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {template.allergens.map(a => {
                                                            const info = getAllergenInfo(a)
                                                            return info ? (
                                                                <span key={a} className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>
                                                                    {info.emoji} {info.label}
                                                                </span>
                                                            ) : null
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <button className="text-gray-400 hover:text-gray-600">
                                                {expandedId === template.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => deleteTemplate(template.id, template.name)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all ml-2"
                                            title="Smazat"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Expanded allergen selector */}
                                    {expandedId === template.id && (
                                        <div className="px-6 pb-4 pt-1">
                                            <p className="text-xs text-gray-500 mb-2 font-medium">Klikni pro přidání/odebrání alergenu:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {ALLERGEN_OPTIONS.map(allergen => (
                                                    <button
                                                        key={allergen.value}
                                                        onClick={() => toggleAllergen(template.id, allergen.value)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${template.allergens.includes(allergen.value)
                                                                ? `${allergen.color} border-2 shadow-sm`
                                                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {allergen.emoji} {allergen.label}
                                                        {template.allergens.includes(allergen.value) && <Check className="w-3 h-3 inline ml-1" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-sm">
                        💡 <strong>Tip:</strong> Klikni na jídlo pro rozbalení a nastavení alergenů.
                        Alergeny se ukládají automaticky – nemusíš nic potvrzovat.
                    </p>
                </div>
            </div>
        </div>
    )
}
