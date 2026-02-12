'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, UtensilsCrossed, Loader2, Check, AlertCircle, X } from 'lucide-react'
import { Session, MenuItem, MealType } from '@/types/database.types'
import { formatDateOnly } from '@/lib/utils'
import { guestStorage } from '@/lib/guest-storage'
// Header not used on menu page

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    breakfast: '🌅 Snídaně',
    lunch: '☀️ Oběd',
    dinner: '🌙 Večeře',
}

const MEAL_TYPE_ICONS: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
}

const DIETARY_OPTIONS = [
    { value: 'vegan', label: '🌱 Vegan', color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'vegetarian', label: '🥬 Vegetarián', color: 'bg-lime-100 text-lime-800 border-lime-300' },
    { value: 'gluten-free', label: '🌾 Bez lepku', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { value: 'lactose-free', label: '🥛 Bez laktózy', color: 'bg-blue-100 text-blue-800 border-blue-300' },
]

export default function EventMenuPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [session, setSession] = useState<Session | null>(null)
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [menuEnabled, setMenuEnabled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Guest state
    const [guestId, setGuestId] = useState<string | null>(null)
    const [guestName, setGuestName] = useState<string | null>(null)

    // Meal selections: meal.id -> true (will eat) / false (won't eat)
    const [selections, setSelections] = useState<Record<string, boolean>>({})

    // Dietary
    const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
    const [dietaryNote, setDietaryNote] = useState('')

    useEffect(() => {
        if (slug) {
            const guest = guestStorage.getCurrentGuest(slug)
            if (guest) {
                setGuestId(guest.id)
                setGuestName(guest.name)
            }
            fetchData()
        }
    }, [slug])

    // Initialize all meals as "will eat" (true) by default when items load
    useEffect(() => {
        if (menuItems.length > 0 && Object.keys(selections).length === 0) {
            const defaultSelections: Record<string, boolean> = {}
            menuItems.forEach(item => {
                defaultSelections[item.id] = true
            })
            setSelections(defaultSelections)
        }
    }, [menuItems])

    const fetchData = async () => {
        try {
            setLoading(true)

            const eventRes = await fetch(`/api/event/${slug}`)
            if (eventRes.ok) {
                const eventData = await eventRes.json()
                setSession(eventData.session)
            }

            const menuRes = await fetch(`/api/event/${slug}/menu`)
            if (menuRes.ok) {
                const menuData = await menuRes.json()
                setMenuItems(menuData.items || [])
                setMenuEnabled(menuData.enabled || false)
            }

            // TODO: fetch existing guest selections if they've saved before
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getEventDays = (): { dayIndex: number; date: Date; label: string; dateStr: string }[] => {
        if (!session?.start_date) return []

        const start = new Date(session.start_date)
        const end = session.end_date ? new Date(session.end_date) : start

        const days: { dayIndex: number; date: Date; label: string; dateStr: string }[] = []
        const current = new Date(start)
        current.setHours(0, 0, 0, 0)
        const endDate = new Date(end)
        endDate.setHours(23, 59, 59, 999)

        let dayIndex = 0
        while (current <= endDate) {
            const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']
            const dayName = dayNames[current.getDay()]
            days.push({
                dayIndex,
                date: new Date(current),
                label: `Den ${dayIndex + 1}`,
                dateStr: `${dayName} ${formatDateOnly(current)}`,
            })
            current.setDate(current.getDate() + 1)
            dayIndex++
        }

        return days
    }

    const getMealsForDay = (dayIndex: number): MenuItem[] => {
        return menuItems
            .filter(item => item.day_index === dayIndex)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    const toggleMealSelection = (mealId: string) => {
        if (!guestId) return
        setSelections(prev => ({
            ...prev,
            [mealId]: !prev[mealId]
        }))
    }

    const toggleDietary = (value: string) => {
        setDietaryRestrictions(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        )
    }

    const getSelectedCount = () => Object.values(selections).filter(v => v).length
    const getSkippedCount = () => Object.values(selections).filter(v => !v).length

    const handleSave = async () => {
        if (!guestId) return

        setSaving(true)
        try {
            // Convert selections to first/last meal format + individual selections
            const selectedMealIds = menuItems
                .filter(m => selections[m.id])
                .map(m => m.id)

            const response = await fetch(`/api/event/${slug}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_id: guestId,
                    meal_selections: selections,
                    selected_meal_ids: selectedMealIds,
                    dietary_restrictions: dietaryRestrictions,
                    dietary_note: dietaryNote,
                })
            })

            if (!response.ok) throw new Error('Failed to save')

            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (error) {
            console.error('Error saving:', error)
            alert('Nepodařilo se uložit')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-6xl mb-4">🍽️</div>
                    <p className="text-gray-600">Načítám jídelníček...</p>
                </div>
            </div>
        )
    }

    if (!session || !menuEnabled) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Jídelníček není dostupný</h2>
                    <p className="text-gray-600 mb-6">Organizátor zatím nezveřejnil jídelníček pro tuto akci.</p>
                    <Link
                        href={`/event/${slug}`}
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Zpět na event
                    </Link>
                </div>
            </div>
        )
    }

    const days = getEventDays()

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 pb-28">

            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <Link
                        href={`/event/${slug}`}
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-3 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Zpět na event
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <UtensilsCrossed className="w-7 h-7 text-orange-500" />
                            Jídelníček – {session.name}
                        </h1>
                        {guestId && (
                            <div className="flex gap-3 text-sm">
                                <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full font-medium">
                                    ✅ {getSelectedCount()}
                                </span>
                                <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-medium">
                                    ❌ {getSkippedCount()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Instructions for registered guests */}
                {guestId && (
                    <div className="bg-white rounded-2xl shadow-md p-5 border border-orange-100">
                        <p className="text-gray-700 text-sm">
                            👋 <strong>Ahoj{guestName ? `, ${guestName}` : ''}!</strong> Klikni na každé jídlo a označ jestli ho <span className="text-green-600 font-semibold">budeš jíst</span> nebo <span className="text-red-500 font-semibold">ne</span>.
                        </p>
                    </div>
                )}

                {/* Day-by-day menu - 2 column grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {days.map((day) => {
                        const dayMeals = getMealsForDay(day.dayIndex)
                        if (dayMeals.length === 0) return null

                        return (
                            <div key={day.dayIndex} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                                {/* Day header */}
                                <div className="px-5 py-4 bg-gradient-to-r from-gray-800 to-gray-700 text-white flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold">📅 {day.label}</h2>
                                        <p className="text-gray-300 text-sm">{day.dateStr}</p>
                                    </div>
                                    {guestId && (
                                        <span className="text-xs bg-white/15 px-3 py-1 rounded-full">
                                            {dayMeals.filter(m => selections[m.id]).length}/{dayMeals.length} jídel
                                        </span>
                                    )}
                                </div>

                                {/* Meals */}
                                <div className="divide-y divide-gray-100">
                                    {dayMeals.map((meal) => {
                                        const isSelected = selections[meal.id] ?? true
                                        const canSelect = !!guestId

                                        return (
                                            <div
                                                key={meal.id}
                                                onClick={() => canSelect && toggleMealSelection(meal.id)}
                                                className={`px-5 py-4 transition-all duration-200 ${canSelect ? 'cursor-pointer hover:shadow-inner' : ''} ${!canSelect
                                                    ? 'bg-white'
                                                    : isSelected
                                                        ? 'bg-green-50 border-l-4 border-l-green-500'
                                                        : 'bg-red-50 border-l-4 border-l-red-400 opacity-75'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        {/* Meal icon + type */}
                                                        <div className="text-2xl flex-shrink-0">
                                                            {MEAL_TYPE_ICONS[meal.meal_type]}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="font-semibold text-gray-900 text-base">
                                                                    {MEAL_TYPE_LABELS[meal.meal_type].replace(/^[^\s]+\s/, '')}
                                                                </span>
                                                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                    {meal.time}
                                                                </span>
                                                            </div>
                                                            {meal.description && (
                                                                <p className={`text-sm ${isSelected ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                                                                    {meal.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Selection indicator */}
                                                    {canSelect && (
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected
                                                            ? 'bg-green-500 text-white shadow-md shadow-green-200'
                                                            : 'bg-red-400 text-white shadow-md shadow-red-200'
                                                            }`}>
                                                            {isSelected ? (
                                                                <Check className="w-6 h-6" />
                                                            ) : (
                                                                <X className="w-6 h-6" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Dietary Preferences */}
                {guestId && (
                    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                        <h2 className="font-bold text-gray-900 mb-1 text-lg">🥗 Stravovací omezení</h2>
                        <p className="text-sm text-gray-500 mb-4">Označ, pokud máš nějaká dietní omezení</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {DIETARY_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleDietary(opt.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${dietaryRestrictions.includes(opt.value)
                                        ? `${opt.color} border-2 shadow-sm`
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {opt.label}
                                    {dietaryRestrictions.includes(opt.value) && <Check className="w-4 h-4 inline ml-1" />}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jiné alergie / poznámka</label>
                            <input
                                type="text"
                                value={dietaryNote}
                                onChange={(e) => setDietaryNote(e.target.value)}
                                placeholder="Např. alergie na ořechy, mořské plody..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Not registered notice */}
                {!guestId && (
                    <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100">
                        <div className="text-5xl mb-4">👤</div>
                        <p className="text-gray-700 font-medium mb-2 text-lg">
                            Pro výběr jídel se nejprve zaregistruj
                        </p>
                        <p className="text-gray-500 text-sm mb-5">
                            Po registraci si budeš moct vybrat, která jídla chceš a která ne
                        </p>
                        <Link
                            href={`/event/${slug}/register`}
                            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                            Zaregistrovat se
                        </Link>
                    </div>
                )}
            </div>

            {/* Floating save button */}
            {guestId && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
                    <div className="max-w-2xl mx-auto">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${saved
                                ? 'bg-green-500 text-white shadow-green-200'
                                : 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400 shadow-orange-200'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Ukládám...
                                </>
                            ) : saved ? (
                                <>
                                    <Check className="w-6 h-6" />
                                    Uloženo! ✅
                                </>
                            ) : (
                                <>
                                    <UtensilsCrossed className="w-5 h-5" />
                                    Uložit výběr ({getSelectedCount()} jídel)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
