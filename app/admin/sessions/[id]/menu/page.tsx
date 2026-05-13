'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, Save, UtensilsCrossed } from 'lucide-react'
import { Session, MenuItem, MealType } from '@/types/database.types'
import { formatDateOnly } from '@/lib/utils'

interface LocalMenuItem {
    id?: string
    _localId: string  // unique client-side ID for stable updates
    day_index: number
    meal_type: MealType
    time: string
    description: string
    order: number
}

let _nextLocalId = 0
const genLocalId = () => `local_${Date.now()}_${_nextLocalId++}`

interface MealTemplate {
    id: string
    name: string
    allergens: string[]
}

interface MenuGuest {
    id: string
    name: string
    nights_count?: number
    check_in_date?: string | null
    check_out_date?: string | null
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: '🌅 Snídaně',
    lunch: '☀️ Oběd',
    dinner: '🌙 Večeře',
}

const MEAL_TYPE_DEFAULTS: Record<MealType, string> = {
    breakfast: '10:00',
    lunch: '15:00',
    dinner: '20:00',
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
    const [guests, setGuests] = useState<MenuGuest[]>([])

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
                // Assign stable local IDs to fetched items
                const itemsWithIds = (data.items || []).map((item: any) => ({
                    ...item,
                    _localId: item._localId || genLocalId(),
                }))
                setMenuItems(itemsWithIds)
                setGuests(data.guests || [])
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

    const getGuestsCountForDay = (date: Date): number => {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        return guests.filter(guest => {
            if (!guest.check_in_date && !guest.check_out_date) return true

            const checkIn = guest.check_in_date ? new Date(guest.check_in_date) : null
            const checkOut = guest.check_out_date ? new Date(guest.check_out_date) : null
            if (checkIn) checkIn.setHours(0, 0, 0, 0)
            if (checkOut) checkOut.setHours(23, 59, 59, 999)

            return (!checkIn || checkIn <= dayEnd) && (!checkOut || checkOut >= dayStart)
        }).length
    }

    const formatPeopleCount = (count: number): string => {
        if (count === 1) return '1 osoba'
        if (count >= 2 && count <= 4) return `${count} osoby`
        return `${count} lidí`
    }

    const addMeal = (dayIndex: number, mealType: MealType) => {
        const newItem: LocalMenuItem = {
            _localId: genLocalId(),
            day_index: dayIndex,
            meal_type: mealType,
            time: MEAL_TYPE_DEFAULTS[mealType],
            description: '',
            order: MEAL_ORDER[mealType],
        }
        setMenuItems(prev => [...prev, newItem])
        setHasChanges(true)
    }

    const updateMeal = (localId: string, field: keyof LocalMenuItem, value: any) => {
        setMenuItems(prev =>
            prev.map(item =>
                item._localId === localId ? { ...item, [field]: value } : item
            )
        )
        setHasChanges(true)
    }

    const removeMeal = (localId: string) => {
        setMenuItems(prev => prev.filter(item => item._localId !== localId))
        setHasChanges(true)
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

            // Filter out items with no description, strip _localId before sending
            const validItems = menuItems
                .filter(item => item.description.trim())
                .map(({ _localId, ...rest }) => rest)

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
            // Re-assign stable local IDs after save
            const savedItems = (data.items || []).map((item: any) => ({
                ...item,
                _localId: genLocalId(),
            }))
            setMenuItems(savedItems)
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
                    _localId: genLocalId(),
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
                        <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                            <span className="text-sm" style={{ color: '#fbbf24' }}>
                                {mealTemplates.length > 0
                                    ? `🍽️ ${mealTemplates.length} jídel v databázi – klikni na štítek pro výběr`
                                    : '⚠️ Žádná jídla v databázi – přidej je ve Správě jídelníčku'}
                            </span>
                            <Link
                                href="/admin/meals"
                                target="_blank"
                                className="text-sm font-semibold underline"
                                style={{ color: '#fbbf24' }}
                            >
                                Spravovat jídla →
                            </Link>
                        </div>

                        {days.length === 0 ? (
                            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                                <p className="font-medium" style={{ color: '#fbbf24' }}>Event nemá nastavené datum začátku a konce.</p>
                                <p className="text-sm mt-1" style={{ color: 'rgba(251, 191, 36, 0.7)' }}>Nastavte prosím datum událost aby se mohly rozložit dny jídelníčku.</p>
                            </div>
                        ) : (
                            days.map((day) => {
                                const dayMeals = getMealsForDay(day.dayIndex)
                                const peopleCount = getGuestsCountForDay(day.date)
                                return (
                                    <div key={day.dayIndex} className="bg-white rounded-xl shadow overflow-hidden">
                                        {/* Day Header */}
                                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, rgba(249, 115, 22, 0.12), rgba(251, 191, 36, 0.08))', borderBottom: '1px solid rgba(249, 115, 22, 0.2)' }}>
                                            <div>
                                                <h2 className="text-lg font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                                                    📅 {day.label}
                                                </h2>
                                                <p className="text-sm mt-0.5" style={{ color: 'var(--nest-text-secondary)' }}>
                                                    {formatPeopleCount(peopleCount)} v tento den
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => addQuickDayMeals(day.dayIndex)}
                                                className="text-sm font-medium px-3 py-1 rounded-lg transition-colors"
                                                style={{ color: '#fb923c', backgroundColor: 'rgba(249, 115, 22, 0.15)' }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.25)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.15)')}
                                            >
                                                + Přidat snídani/oběd/večeři
                                            </button>
                                        </div>

                                        {/* Meals for this day */}
                                        <div className="p-6 space-y-4">
                                            {dayMeals.length === 0 ? (
                                                <p className="text-gray-400 text-sm text-center py-4">Žádná jídla pro tento den</p>
                                            ) : (
                                                dayMeals.map((meal) => {
                                                    return (
                                                        <div key={meal._localId} className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)' }}>
                                                            {/* Meal type */}
                                                            <div className="w-40">
                                                                <select
                                                                    value={meal.meal_type}
                                                                    onChange={(e) => updateMeal(meal._localId, 'meal_type', e.target.value as MealType)}
                                                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                                                    style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
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
                                                                    onChange={(e) => updateMeal(meal._localId, 'time', e.target.value)}
                                                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                                                    style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                                                                />
                                                            </div>

                                                            {/* Description */}
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    value={meal.description}
                                                                    onChange={(e) => updateMeal(meal._localId, 'description', e.target.value)}
                                                                    placeholder="Začni psát nebo vyber z databáze níže..."
                                                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                                                    style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                                                                    list={`templates-${meal._localId}`}
                                                                />
                                                                <datalist id={`templates-${meal._localId}`}>
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
                                                                                    updateMeal(meal._localId, 'description', t.name)
                                                                                }}
                                                                                className="text-xs px-2.5 py-1 rounded-full transition-colors"
                                                                                style={meal.description === t.name
                                                                                    ? { backgroundColor: 'rgba(251, 191, 36, 0.3)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.5)', fontWeight: 600 }
                                                                                    : { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.25)' }}
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
                                                                onClick={() => removeMeal(meal._localId)}
                                                                className="p-2 rounded-lg transition-colors"
                                                                style={{ color: '#f87171' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)' }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
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
                                                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                                                        style={{ backgroundColor: 'var(--nest-surface)', color: 'var(--nest-text-secondary)', border: '1px solid var(--nest-border)' }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--nest-surface)')}
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
