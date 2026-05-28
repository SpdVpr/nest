'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, UtensilsCrossed, Loader2, Check, AlertCircle, X } from 'lucide-react'
import { GuestMealPreference, Session, MenuItem, MealType } from '@/types/database.types'
import { formatDateOnly } from '@/lib/utils'
import { useCurrentGuest } from '@/lib/auth-context'
import NestLoading from '@/components/NestLoading'
import NestPage from '@/components/NestPage'

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
    { value: 'vegan', label: '🌱 Vegan', color: 'bg-green-900/40 text-green-300 border-green-700/50' },
    { value: 'vegetarian', label: '🥬 Vegetarián', color: 'bg-lime-900/40 text-lime-300 border-lime-700/50' },
    { value: 'gluten-free', label: '🌾 Bez lepku', color: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
    { value: 'lactose-free', label: '🥛 Bez laktózy', color: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
]

interface MenuGuest {
    id: string
    name?: string
    check_in_date?: string | null
    check_out_date?: string | null
    meal_preferences?: GuestMealPreference[]
    dietary_restrictions?: string[]
    dietary_note?: string | null
}

const toDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export default function EventMenuPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [session, setSession] = useState<Session | null>(null)
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [menuEnabled, setMenuEnabled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [guest, setGuest] = useState<MenuGuest | null>(null)

    // Guest state (derived from auth context + localStorage)
    const storedGuest = useCurrentGuest(slug)
    const guestId = storedGuest?.id || null
    const guestName = storedGuest?.name || null

    // Meal selections: meal.id -> true (will eat) / false (won't eat)
    const [selections, setSelections] = useState<Record<string, boolean>>({})

    // Dietary
    const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
    const [dietaryNote, setDietaryNote] = useState('')

    useEffect(() => {
        if (slug) {
            fetchData()
        }
    }, [slug, guestId])

    useEffect(() => {
        setSelections(prev => buildInitialSelections(prev))
    }, [menuItems, guest, session])

    const fetchData = async () => {
        try {
            setLoading(true)

            const eventRes = await fetch(`/api/event/${slug}`)
            if (eventRes.ok) {
                const eventData = await eventRes.json()
                setSession(eventData.session)
            }

            const menuUrl = guestId
                ? `/api/event/${slug}/menu?guest_id=${guestId}`
                : `/api/event/${slug}/menu`
            const menuRes = await fetch(menuUrl)
            if (menuRes.ok) {
                const menuData = await menuRes.json()
                setMenuItems(menuData.items || [])
                setMenuEnabled(menuData.enabled || false)
                setGuest(menuData.guest || null)

                // Restore saved selections if available
                if (menuData.savedSelections && typeof menuData.savedSelections === 'object') {
                    setSelections(menuData.savedSelections)
                }
                if (menuData.guest) {
                    setDietaryRestrictions(Array.isArray(menuData.guest.dietary_restrictions) ? menuData.guest.dietary_restrictions : [])
                    setDietaryNote(menuData.guest.dietary_note || '')
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getDayDateKey = (dayIndex: number): string | null => {
        if (!session?.start_date) return null
        const date = new Date(session.start_date)
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() + dayIndex)
        return toDateKey(date)
    }

    const isGuestPresentOnDay = (dayIndex: number): boolean => {
        if (!guestId || !guest?.check_in_date || !guest?.check_out_date) return true
        const dayKey = getDayDateKey(dayIndex)
        if (!dayKey) return true

        const checkIn = new Date(guest.check_in_date)
        const checkOut = new Date(guest.check_out_date)
        const checkInKey = toDateKey(checkIn)
        const checkOutKey = toDateKey(checkOut)

        return dayKey >= checkInKey && dayKey <= checkOutKey
    }

    const canGuestEatMeal = (meal: MenuItem): boolean => {
        if (!isGuestPresentOnDay(meal.day_index)) return false
        const dayKey = getDayDateKey(meal.day_index)
        if (!dayKey) return true

        const preference = guest?.meal_preferences?.find(item => item.date === dayKey)
        if (!preference) return true
        if (meal.meal_type === 'lunch') return preference.lunch === true
        if (meal.meal_type === 'dinner') return preference.dinner === true
        return true
    }

    const buildInitialSelections = (savedSelections: Record<string, boolean>): Record<string, boolean> => {
        const next: Record<string, boolean> = {}

        menuItems.forEach(item => {
            if (!canGuestEatMeal(item)) {
                next[item.id] = false
                return
            }
            next[item.id] = savedSelections[item.id] ?? true
        })

        return next
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
            .filter(item => !guestId || canGuestEatMeal(item))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    const toggleMealSelection = (mealId: string) => {
        if (!guestId) return
        const meal = menuItems.find(item => item.id === mealId)
        if (!meal || !canGuestEatMeal(meal)) return
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

    const getRelevantMeals = () => menuItems.filter(item => !guestId || canGuestEatMeal(item))
    const getSelectedCount = () => getRelevantMeals().filter(item => selections[item.id]).length
    const getSkippedCount = () => getRelevantMeals().filter(item => selections[item.id] === false).length

    const handleSave = async () => {
        if (!guestId) return

        setSaving(true)
        try {
            const sanitizedSelections = buildInitialSelections(selections)
            // Convert selections to first/last meal format + individual selections
            const selectedMealIds = menuItems
                .filter(m => sanitizedSelections[m.id])
                .map(m => m.id)

            const response = await fetch(`/api/event/${slug}/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_id: guestId,
                    meal_selections: sanitizedSelections,
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
        return <NestLoading message="Načítám jídelníček..." />
    }

    if (!session || !menuEnabled) {
        return (
            <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)] flex items-center justify-center p-4">
                <div className="max-w-md w-full nest-card-elevated p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-[var(--nest-white-40)] mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Jídelníček není dostupný</h2>
                    <p className="text-[var(--nest-white-60)] mb-6 text-sm">Organizátor zatím nezveřejnil jídelníček pro tuto akci.</p>
                    <Link
                        href={`/event/${slug}`}
                        className="inline-flex items-center gap-2 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-dark)] px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Zpět na event
                    </Link>
                </div>
            </div>
        )
    }

    const days = getEventDays()

    return (
        <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title={`Jídelníček`} maxWidth="max-w-5xl">

            {guestId && (
                <div className="flex gap-2 text-xs mb-4 justify-end">
                    <span className="bg-[var(--nest-success)]/10 text-[var(--nest-success)] px-2.5 py-1 rounded-full font-medium border border-[var(--nest-success)]/20">
                        ✅ {getSelectedCount()}
                    </span>
                    <span className="bg-[var(--nest-error)]/10 text-[var(--nest-error)] px-2.5 py-1 rounded-full font-medium border border-[var(--nest-error)]/20">
                        ❌ {getSkippedCount()}
                    </span>
                </div>
            )}
            {/* Instructions for registered guests */}
            {guestId && (
                <div className="bg-[var(--nest-surface)] rounded-2xl shadow-md p-5 border border-[var(--nest-yellow)]/20">
                    <p className="text-[var(--nest-text-primary)] text-sm">
                        👋 <strong>Ahoj{guestName ? `, ${guestName}` : ''}!</strong> Klikni na každé jídlo a označ jestli ho <span className="text-green-400 font-semibold">budeš jíst</span> nebo <span className="text-red-400 font-semibold">ne</span>.
                    </p>
                </div>
            )}

            {/* Day-by-day menu - 2 column grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {days.map((day) => {
                    const dayMeals = getMealsForDay(day.dayIndex)
                    if (dayMeals.length === 0) return null

                    return (
                        <div key={day.dayIndex} className="bg-[var(--nest-surface)] rounded-2xl shadow-md overflow-hidden border border-[var(--nest-border)]">
                            {/* Day header */}
                            <div className="px-5 py-4 bg-gradient-to-r from-[var(--nest-bg)] to-[var(--nest-dark-3)] text-[var(--nest-text-primary)] flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold">📅 {day.label}</h2>
                                    <p className="text-[var(--nest-text-secondary)] text-sm">{day.dateStr}</p>
                                </div>
                                {guestId && (
                                    <span className="text-xs bg-white/15 px-3 py-1 rounded-full">
                                        {dayMeals.filter(m => selections[m.id]).length}/{dayMeals.length} jídel
                                    </span>
                                )}
                            </div>

                            {/* Meals */}
                            <div className="divide-y divide-[var(--nest-border)]">
                                {dayMeals.map((meal) => {
                                    const isSelected = selections[meal.id] ?? true
                                    const canSelect = !!guestId

                                    return (
                                        <div
                                            key={meal.id}
                                            onClick={() => canSelect && toggleMealSelection(meal.id)}
                                            className={`px-5 py-4 transition-all duration-200 ${canSelect ? 'cursor-pointer hover:bg-[var(--nest-surface-alt)]' : ''} ${!canSelect
                                                ? 'bg-[var(--nest-surface)]'
                                                : isSelected
                                                    ? 'bg-green-900/20 border-l-4 border-l-green-500'
                                                    : 'bg-red-900/20 border-l-4 border-l-red-400 opacity-75'
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
                                                            <span className="font-semibold text-[var(--nest-text-primary)] text-base">
                                                                {MEAL_TYPE_LABELS[meal.meal_type].replace(/^[^\s]+\s/, '')}
                                                            </span>
                                                            <span className="text-xs text-[var(--nest-text-tertiary)] bg-[var(--nest-bg)] px-2 py-0.5 rounded-full">
                                                                {meal.time}
                                                            </span>
                                                        </div>
                                                        {meal.description && (
                                                            <p className={`text-sm ${isSelected ? 'text-[var(--nest-text-secondary)]' : 'text-[var(--nest-text-tertiary)] line-through'}`}>
                                                                {meal.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Selection indicator */}
                                                {canSelect && (
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelected
                                                        ? 'bg-green-500 text-white shadow-md shadow-green-900/50'
                                                        : 'bg-red-400 text-white shadow-md shadow-red-900/50'
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
                <div className="bg-[var(--nest-surface)] rounded-2xl shadow-md p-6 border border-[var(--nest-border)]">
                    <h2 className="font-bold text-[var(--nest-text-primary)] mb-1 text-lg">🥗 Stravovací omezení</h2>
                    <p className="text-sm text-[var(--nest-text-secondary)] mb-4">Označ, pokud máš nějaká dietní omezení</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {DIETARY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => toggleDietary(opt.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${dietaryRestrictions.includes(opt.value)
                                    ? `${opt.color} border-2 shadow-sm`
                                    : 'bg-[var(--nest-bg)] text-[var(--nest-text-secondary)] border-[var(--nest-border)] hover:bg-[var(--nest-surface-alt)]'
                                    }`}
                            >
                                {opt.label}
                                {dietaryRestrictions.includes(opt.value) && <Check className="w-4 h-4 inline ml-1" />}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--nest-text-secondary)] mb-1">Jiné alergie / poznámka</label>
                        <input
                            type="text"
                            value={dietaryNote}
                            onChange={(e) => setDietaryNote(e.target.value)}
                            placeholder="Např. alergie na ořechy, mořské plody..."
                            className="w-full px-4 py-2.5 border border-[var(--nest-border)] rounded-xl bg-[var(--nest-bg)] text-[var(--nest-text-primary)] placeholder:text-[var(--nest-text-tertiary)] text-sm focus:outline-none focus:border-[var(--nest-yellow)]/50"
                        />
                    </div>
                </div>
            )}

            {/* Not registered notice */}
            {!guestId && (
                <div className="bg-[var(--nest-surface)] rounded-2xl shadow-md p-8 text-center border border-[var(--nest-border)]">
                    <div className="text-5xl mb-4">👤</div>
                    <p className="text-[var(--nest-text-primary)] font-medium mb-2 text-lg">
                        Pro výběr jídel se nejprve zaregistruj
                    </p>
                    <p className="text-[var(--nest-text-secondary)] text-sm mb-5">
                        Po registraci si budeš moct vybrat, která jídla chceš a která ne
                    </p>
                    <Link
                        href={`/event/${slug}/register`}
                        className="inline-flex items-center gap-2 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-bg)] px-6 py-3 rounded-xl font-semibold transition-colors"
                    >
                        Zaregistrovat se
                    </Link>
                </div>
            )}

            {/* Floating save button */}
            {
                guestId && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--nest-bg)] via-[var(--nest-bg)] to-transparent">
                        <div className="max-w-2xl mx-auto">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${saved
                                    ? 'bg-green-500 text-white shadow-green-900/50'
                                    : 'bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-bg)] disabled:bg-[var(--nest-border)] shadow-[var(--nest-yellow)]/20'
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
                )
            }
        </NestPage >
    )
}
