'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, Save, UtensilsCrossed } from 'lucide-react'
import { Session, MenuItem, MealType } from '@/types/database.types'
import { formatDateOnly } from '@/lib/utils'

interface LocalMenuItem {
    id?: string
    day_index: number
    meal_type: MealType
    time: string
    description: string
    order: number
}

interface MealTemplate {
    id: string
    name: string
    allergens: string[]
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: '🌅 Snídaně',
    lunch: '☀️ Oběd',
    dinner: '🌙 Večeře',
}

const MEAL_TYPE_DEFAULTS: Record<MealType, string> = {
    breakfast: '10:00',
    lunch: '15:00',
    dinner: '21:00',
}

const MEAL_ORDER: Record<MealType, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
}

export default function MenuEditorPage() {
    const router = useRouter()
    const params = useParams()
    const sessionId = params?.id as string

    const [session, setSession] = useState<Session | null>(null)
    const [menuItems, setMenuItems] = useState<LocalMenuItem[]>([])
    const [menuEnabled, setMenuEnabled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([])

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
        } else {
            setIsAuthenticated(true)
            fetchData()
        }
    }, [sessionId, router])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('admin_token')

            // Fetch session details
            const sessionRes = await fetch(`/api/admin/sessions/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (sessionRes.ok) {
                const data = await sessionRes.json()
                setSession(data.session)
                setMenuEnabled(data.session.menu_enabled || false)
            }

            // Fetch existing menu items
            const menuRes = await fetch(`/api/admin/sessions/${sessionId}/menu`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (menuRes.ok) {
                const data = await menuRes.json()
                setMenuItems(data.items || [])
            }

            // Fetch meal templates
            const templatesRes = await fetch('/api/admin/meal-templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (templatesRes.ok) {
                const data = await templatesRes.json()
                setMealTemplates(data.templates || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getEventDays = (): { dayIndex: number; date: Date; label: string }[] => {
        if (!session?.start_date) return []

        const start = new Date(session.start_date)
        const end = session.end_date ? new Date(session.end_date) : start

        const days: { dayIndex: number; date: Date; label: string }[] = []
        const current = new Date(start)
        current.setHours(0, 0, 0, 0)
        const endDate = new Date(end)
        endDate.setHours(23, 59, 59, 999)

        let dayIndex = 0
        while (current <= endDate) {
            days.push({
                dayIndex,
                date: new Date(current),
                label: `Den ${dayIndex + 1} – ${formatDateOnly(current)}`,
            })
            current.setDate(current.getDate() + 1)
            dayIndex++
        }

        return days
    }

    const getMealsForDay = (dayIndex: number): LocalMenuItem[] => {
        return menuItems
            .filter(item => item.day_index === dayIndex)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    const addMeal = (dayIndex: number, mealType: MealType) => {
        const newItem: LocalMenuItem = {
            day_index: dayIndex,
            meal_type: mealType,
            time: MEAL_TYPE_DEFAULTS[mealType],
            description: '',
            order: MEAL_ORDER[mealType],
        }
        setMenuItems(prev => [...prev, newItem])
        setHasChanges(true)
    }

    const updateMeal = (index: number, field: keyof LocalMenuItem, value: any) => {
        setMenuItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
        setHasChanges(true)
    }

    const removeMeal = (index: number) => {
        setMenuItems(prev => prev.filter((_, i) => i !== index))
        setHasChanges(true)
    }

    const getGlobalIndex = (dayIndex: number, localIndex: number): number => {
        let count = 0
        for (const item of menuItems) {
            if (item.day_index === dayIndex) {
                if (localIndex === 0) return count
                localIndex--
            }
            count++
        }
        return -1
    }

    const toggleMenuEnabled = async () => {
        const newValue = !menuEnabled
        setMenuEnabled(newValue)
        try {
            const token = localStorage.getItem('admin_token')
            await fetch(`/api/admin/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ menu_enabled: newValue })
            })
        } catch (error) {
            console.error('Error toggling menu:', error)
            setMenuEnabled(!newValue) // revert
        }
    }

    const saveMenu = async () => {
        setSaving(true)
        try {
            const token = localStorage.getItem('admin_token')

            // Filter out items with no description
            const validItems = menuItems.filter(item => item.description.trim())

            const response = await fetch(`/api/admin/sessions/${sessionId}/menu`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: validItems })
            })

            if (!response.ok) throw new Error('Failed to save menu')

            const data = await response.json()
            setMenuItems(data.items || [])
            setHasChanges(false)
            alert('Jídelníček uložen ✅')
        } catch (error) {
            console.error('Error saving menu:', error)
            alert('Nepodařilo se uložit jídelníček')
        } finally {
            setSaving(false)
        }
    }

    const addQuickDayMeals = (dayIndex: number) => {
        const existing = getMealsForDay(dayIndex)
        const existingTypes = new Set(existing.map(m => m.meal_type))

        const toAdd: MealType[] = ['breakfast', 'lunch', 'dinner']
        const newItems: LocalMenuItem[] = []

        for (const type of toAdd) {
            if (!existingTypes.has(type)) {
                newItems.push({
                    day_index: dayIndex,
                    meal_type: type,
                    time: MEAL_TYPE_DEFAULTS[type],
                    description: '',
                    order: MEAL_ORDER[type],
                })
            }
        }

        if (newItems.length > 0) {
            setMenuItems(prev => [...prev, ...newItems])
            setHasChanges(true)
        }
    }

    if (!isAuthenticated || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <p className="text-gray-600">Event nenalezen</p>
            </div>
        )
    }

    const days = getEventDays()

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <Link
                        href={`/admin/sessions/${sessionId}`}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Zpět na detail eventu
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <UtensilsCrossed className="w-8 h-8 text-orange-500" />
                                Jídelníček – {session.name}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {formatDateOnly(session.start_date)}
                                {session.end_date && ` - ${formatDateOnly(session.end_date)}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {hasChanges && (
                                <button
                                    onClick={saveMenu}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 disabled:bg-gray-400"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {saving ? 'Ukládám...' : 'Uložit jídelníček'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Menu Enabled Toggle */}
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                    <label className="flex items-center gap-4 cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={menuEnabled}
                                onChange={toggleMenuEnabled}
                                className="sr-only"
                            />
                            <div className={`block w-14 h-8 rounded-full transition-colors ${menuEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${menuEnabled ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-900">Zobrazit jídelníček</span>
                            <p className="text-sm text-gray-600">
                                {menuEnabled ? 'Hosté uvidí jídelníček a budou moci vybrat svá jídla' : 'Jídelníček je skrytý pro hosty'}
                            </p>
                        </div>
                    </label>
                </div>

                {/* Menu Editor */}
                {menuEnabled && (
                    <div className="space-y-6">
                        {/* Templates info */}
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
                            <span className="text-sm text-amber-800">
                                {mealTemplates.length > 0
                                    ? `🍽️ ${mealTemplates.length} jídel v databázi – klikni na štítek pro výběr`
                                    : '⚠️ Žádná jídla v databázi – přidej je ve Správě jídelníčku'}
                            </span>
                            <Link
                                href="/admin/meals"
                                target="_blank"
                                className="text-sm text-amber-700 hover:text-amber-900 font-semibold underline"
                            >
                                Spravovat jídla →
                            </Link>
                        </div>

                        {days.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                                <p className="text-yellow-700 font-medium">Event nemá nastavené datum začátku a konce.</p>
                                <p className="text-yellow-600 text-sm mt-1">Nastavte prosím datum událost aby se mohly rozložit dny jídelníčku.</p>
                            </div>
                        ) : (
                            days.map((day) => {
                                const dayMeals = getMealsForDay(day.dayIndex)
                                return (
                                    <div key={day.dayIndex} className="bg-white rounded-xl shadow overflow-hidden">
                                        {/* Day Header */}
                                        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-gray-900">
                                                📅 {day.label}
                                            </h2>
                                            <button
                                                onClick={() => addQuickDayMeals(day.dayIndex)}
                                                className="text-sm text-orange-600 hover:text-orange-700 font-medium bg-orange-100 px-3 py-1 rounded-lg hover:bg-orange-200 transition-colors"
                                            >
                                                + Přidat snídani/oběd/večeři
                                            </button>
                                        </div>

                                        {/* Meals for this day */}
                                        <div className="p-6 space-y-4">
                                            {dayMeals.length === 0 ? (
                                                <p className="text-gray-400 text-sm text-center py-4">Žádná jídla pro tento den</p>
                                            ) : (
                                                dayMeals.map((meal, localIdx) => {
                                                    const globalIdx = getGlobalIndex(day.dayIndex, localIdx)
                                                    return (
                                                        <div key={`${day.dayIndex}-${localIdx}`} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                                                            {/* Meal type */}
                                                            <div className="w-40">
                                                                <select
                                                                    value={meal.meal_type}
                                                                    onChange={(e) => updateMeal(globalIdx, 'meal_type', e.target.value as MealType)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                                                                >
                                                                    <option value="breakfast">🌅 Snídaně</option>
                                                                    <option value="lunch">☀️ Oběd</option>
                                                                    <option value="dinner">🌙 Večeře</option>
                                                                </select>
                                                            </div>

                                                            {/* Time */}
                                                            <div className="w-28">
                                                                <input
                                                                    type="time"
                                                                    value={meal.time}
                                                                    onChange={(e) => updateMeal(globalIdx, 'time', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                                                                />
                                                            </div>

                                                            {/* Description */}
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    value={meal.description}
                                                                    onChange={(e) => updateMeal(globalIdx, 'description', e.target.value)}
                                                                    placeholder="Začni psát nebo vyber z databáze níže..."
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                                                                    list={`templates-${day.dayIndex}-${localIdx}`}
                                                                />
                                                                <datalist id={`templates-${day.dayIndex}-${localIdx}`}>
                                                                    {mealTemplates.map(t => (
                                                                        <option key={t.id} value={t.name} />
                                                                    ))}
                                                                </datalist>
                                                                {/* Quick pick from database */}
                                                                {mealTemplates.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                                        {mealTemplates.map(t => (
                                                                            <button
                                                                                key={t.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    updateMeal(globalIdx, 'description', t.name)
                                                                                }}
                                                                                className={`text-xs px-2.5 py-1 rounded-full transition-colors border ${meal.description === t.name
                                                                                    ? 'bg-amber-200 text-amber-900 border-amber-400 font-semibold'
                                                                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                                                                    }`}
                                                                                title={t.allergens?.length ? `Alergeny: ${t.allergens.join(', ')}` : undefined}
                                                                            >
                                                                                🍽️ {t.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Delete */}
                                                            <button
                                                                onClick={() => removeMeal(globalIdx)}
                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )
                                                })
                                            )}

                                            {/* Add meal button */}
                                            <div className="flex gap-2 pt-2">
                                                {(['breakfast', 'lunch', 'dinner'] as MealType[]).map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => addMeal(day.dayIndex, type)}
                                                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                                    >
                                                        + {MEAL_TYPE_LABELS[type]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}

                        {/* Bottom save button */}
                        {hasChanges && (
                            <div className="sticky bottom-4 flex justify-center">
                                <button
                                    onClick={saveMenu}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 disabled:bg-gray-400 text-lg"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {saving ? 'Ukládám...' : 'Uložit jídelníček'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
