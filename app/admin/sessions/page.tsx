'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, PlayCircle, StopCircle, Edit, Eye, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { Session, MealType } from '@/types/database.types'
import { formatDate, formatDateOnly } from '@/lib/utils'

interface MealTemplate {
  id: string
  name: string
  allergens: string[]
  category: string
}

interface InlineMenuItem {
  day_index: number
  meal_type: MealType
  time: string
  description: string
  order: number
}

export default function AdminSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionStartDate, setNewSessionStartDate] = useState('')
  const [newSessionEndDate, setNewSessionEndDate] = useState('')
  const [newSessionStartTime, setNewSessionStartTime] = useState('')
  const [newSessionEndTime, setNewSessionEndTime] = useState('')
  const [newSessionDescription, setNewSessionDescription] = useState('')

  // Menu state
  const [menuEnabled, setMenuEnabled] = useState(false)
  const [menuItems, setMenuItems] = useState<InlineMenuItem[]>([])
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchSessions()
      fetchMealTemplates()
    }
  }, [router])

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMealTemplates = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/meal-templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMealTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching meal templates:', error)
    }
  }

  const addMealTemplate = async () => {
    if (!newTemplateName.trim()) return
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/meal-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTemplateName.trim() })
      })
      if (response.ok) {
        setNewTemplateName('')
        fetchMealTemplates()
      }
    } catch (error) {
      console.error('Error adding meal template:', error)
    }
  }

  const deleteMealTemplate = async (id: string) => {
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
      fetchMealTemplates()
    } catch (error) {
      console.error('Error deleting meal template:', error)
    }
  }

  // Calculate event days from dates
  const getEventDays = (): { dayIndex: number; date: Date; label: string }[] => {
    if (!newSessionStartDate || !newSessionEndDate) return []

    const start = new Date(newSessionStartDate)
    const end = new Date(newSessionEndDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []

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

  // Auto-generate default menu structure when dates change
  const generateDefaultMenu = () => {
    const days = getEventDays()
    if (days.length === 0) return

    const items: InlineMenuItem[] = []
    days.forEach(day => {
      // Snídaně - vždy bufet
      items.push({
        day_index: day.dayIndex,
        meal_type: 'breakfast',
        time: '10:00',
        description: 'Bufet',
        order: 0,
      })
      // Oběd
      items.push({
        day_index: day.dayIndex,
        meal_type: 'lunch',
        time: '15:00',
        description: '',
        order: 1,
      })
      // Večeře
      items.push({
        day_index: day.dayIndex,
        meal_type: 'dinner',
        time: '21:00',
        description: '',
        order: 2,
      })
    })

    setMenuItems(items)
  }

  // When dates change, regenerate menu if enabled
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setNewSessionStartDate(value)
    } else {
      setNewSessionEndDate(value)
    }
  }

  // Regenerate menu when dates change and menu is enabled
  useEffect(() => {
    if (menuEnabled && newSessionStartDate && newSessionEndDate && showCreateForm) {
      generateDefaultMenu()
    }
  }, [newSessionStartDate, newSessionEndDate, menuEnabled])

  const getMealsForDay = (dayIndex: number): InlineMenuItem[] => {
    return menuItems
      .filter(item => item.day_index === dayIndex)
      .sort((a, b) => a.order - b.order)
  }

  const updateMealDescription = (dayIndex: number, mealType: MealType, value: string) => {
    setMenuItems(prev => prev.map(item =>
      item.day_index === dayIndex && item.meal_type === mealType
        ? { ...item, description: value }
        : item
    ))
  }

  const updateMealTime = (dayIndex: number, mealType: MealType, value: string) => {
    setMenuItems(prev => prev.map(item =>
      item.day_index === dayIndex && item.meal_type === mealType
        ? { ...item, time: value }
        : item
    ))
  }

  const createSession = async () => {
    if (!newSessionName.trim()) {
      alert('Název eventu je povinný')
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const sessionData: any = { name: newSessionName }

      if (newSessionStartDate) {
        const startDate = new Date(newSessionStartDate)
        if (newSessionStartTime) {
          const [hours, minutes] = newSessionStartTime.split(':').map(Number)
          startDate.setHours(hours, minutes, 0, 0)
        } else {
          startDate.setHours(0, 0, 0, 0)
        }
        sessionData.start_date = startDate.toISOString()
      }

      if (newSessionEndDate && newSessionEndDate.trim()) {
        const endDate = new Date(newSessionEndDate)
        if (newSessionEndTime) {
          const [hours, minutes] = newSessionEndTime.split(':').map(Number)
          endDate.setHours(hours, minutes, 59, 999)
        } else {
          endDate.setHours(23, 59, 59, 999)
        }
        sessionData.end_date = endDate.toISOString()
      } else {
        sessionData.end_date = null
      }

      if (newSessionDescription.trim()) {
        sessionData.description = newSessionDescription
      }

      if (newSessionStartTime && newSessionStartTime.trim()) {
        sessionData.start_time = newSessionStartTime
      }

      if (newSessionEndTime && newSessionEndTime.trim()) {
        sessionData.end_time = newSessionEndTime
      }

      sessionData.menu_enabled = menuEnabled

      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) throw new Error('Failed to create session')

      const result = await response.json()
      const newSessionId = result.session?.id

      // Save menu items if menu is enabled and we have a session ID
      if (menuEnabled && newSessionId && menuItems.length > 0) {
        const validItems = menuItems.filter(item => item.description.trim())
        if (validItems.length > 0) {
          await fetch(`/api/admin/sessions/${newSessionId}/menu`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items: validItems })
          })
        }
      }

      resetForm()
      setShowCreateForm(false)
      fetchSessions()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Nepodařilo se vytvořit session')
    }
  }

  const updateSession = async () => {
    if (!editingSession || !newSessionName.trim()) {
      alert('Název eventu je povinný')
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const sessionData: any = { name: newSessionName }

      if (newSessionStartDate) {
        const startDate = new Date(newSessionStartDate)
        if (newSessionStartTime) {
          const [hours, minutes] = newSessionStartTime.split(':').map(Number)
          startDate.setHours(hours, minutes, 0, 0)
        } else {
          startDate.setHours(0, 0, 0, 0)
        }
        sessionData.start_date = startDate.toISOString()
      }

      if (newSessionEndDate && newSessionEndDate.trim()) {
        const endDate = new Date(newSessionEndDate)
        if (newSessionEndTime) {
          const [hours, minutes] = newSessionEndTime.split(':').map(Number)
          endDate.setHours(hours, minutes, 59, 999)
        } else {
          endDate.setHours(23, 59, 59, 999)
        }
        sessionData.end_date = endDate.toISOString()
      } else {
        sessionData.end_date = null
      }

      if (newSessionDescription.trim()) {
        sessionData.description = newSessionDescription
      }

      if (newSessionStartTime && newSessionStartTime.trim()) {
        sessionData.start_time = newSessionStartTime
      }

      if (newSessionEndTime && newSessionEndTime.trim()) {
        sessionData.end_time = newSessionEndTime
      }

      const response = await fetch(`/api/admin/sessions/${editingSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) throw new Error('Failed to update session')

      resetForm()
      setEditingSession(null)
      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Nepodařilo se aktualizovat session')
    }
  }

  const startEditSession = (session: Session) => {
    setEditingSession(session)
    setNewSessionName(session.name)
    const startDate = session.start_date ? formatDateTimeLocal(new Date(session.start_date)) : ''
    const endDate = session.end_date ? formatDateTimeLocal(new Date(session.end_date)) : ''
    setNewSessionStartDate(startDate)
    setNewSessionEndDate(endDate)
    setNewSessionStartTime(session.start_time || '')
    setNewSessionEndTime(session.end_time || '')
    setNewSessionDescription(session.description || '')
    setShowCreateForm(false)
  }

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const resetForm = () => {
    setNewSessionName('')
    setNewSessionStartDate('')
    setNewSessionEndDate('')
    setNewSessionStartTime('')
    setNewSessionEndTime('')
    setNewSessionDescription('')
    setMenuEnabled(false)
    setMenuItems([])
  }

  const cancelEdit = () => {
    setEditingSession(null)
    resetForm()
  }

  const toggleSessionActive = async (sessionId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (!response.ok) throw new Error('Failed to update session')

      fetchSessions()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Nepodařilo se aktualizovat session')
    }
  }

  const getMealTypeLabel = (type: MealType) => {
    switch (type) {
      case 'breakfast': return '🌅 Snídaně'
      case 'lunch': return '☀️ Oběd'
      case 'dinner': return '🌙 Večeře'
    }
  }

  // Shared form fields component
  const renderFormFields = () => {
    const days = getEventDays()

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Název eventu *</label>
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="např. LAN Party - Listopad 2025"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datum začátku</label>
            <input
              type="date"
              value={newSessionStartDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datum konce</label>
            <input
              type="date"
              value={newSessionEndDate || ''}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Čas začátku</label>
            <input
              type="time"
              value={newSessionStartTime}
              onChange={(e) => setNewSessionStartTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Čas konce</label>
            <input
              type="time"
              value={newSessionEndTime}
              onChange={(e) => setNewSessionEndTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Popis eventu</label>
          <textarea
            value={newSessionDescription}
            onChange={(e) => setNewSessionDescription(e.target.value)}
            placeholder="Popis eventu..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
            rows={3}
          />
        </div>

        {/* Menu section - only in create form */}
        {showCreateForm && (
          <>
            <hr className="border-gray-200" />

            {/* Menu toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={menuEnabled}
                    onChange={(e) => {
                      setMenuEnabled(e.target.checked)
                      if (e.target.checked && menuItems.length === 0) {
                        generateDefaultMenu()
                      }
                    }}
                    className="sr-only"
                  />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${menuEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-0.5 top-0.5 bg-white w-6 h-6 rounded-full transition-transform ${menuEnabled ? 'translate-x-5' : ''}`}></div>
                </div>
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-gray-900">Jídelníček</span>
                </div>
              </label>

              {menuEnabled && (
                <button
                  onClick={() => setShowTemplateManager(!showTemplateManager)}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                >
                  {showTemplateManager ? 'Skrýt databázi jídel' : 'Spravovat databázi jídel'}
                </button>
              )}
            </div>

            {/* Meal Templates Manager */}
            {menuEnabled && showTemplateManager && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📋 Databáze jídel
                  <span className="text-sm font-normal text-gray-500">({mealTemplates.length} jídel)</span>
                </h4>

                <div className="flex flex-wrap gap-2 mb-3">
                  {mealTemplates.map(template => (
                    <div key={template.id} className="flex items-center gap-1 bg-white border border-orange-200 rounded-full px-3 py-1">
                      <span className="text-sm text-gray-900">{template.name}</span>
                      <button
                        onClick={() => deleteMealTemplate(template.id)}
                        className="text-red-400 hover:text-red-600 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Přidat jídlo (např. Kuřecí řízek)"
                    className="flex-1 px-3 py-1.5 border border-orange-300 rounded-lg text-gray-900 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addMealTemplate()}
                  />
                  <button
                    onClick={addMealTemplate}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    + Přidat
                  </button>
                </div>
              </div>
            )}

            {/* Inline Menu Editor */}
            {menuEnabled && days.length > 0 && (
              <div className="space-y-4">
                {/* Templates loaded info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {mealTemplates.length > 0
                      ? `📋 ${mealTemplates.length} jídel v databázi – klikni pro výběr`
                      : '⚠️ Žádná jídla v databázi – přidej je v Správě jídelníčku'}
                  </span>
                  <Link
                    href="/admin/meals"
                    target="_blank"
                    className="text-amber-600 hover:text-amber-700 font-medium underline"
                  >
                    Spravovat jídla →
                  </Link>
                </div>
                {days.map(day => {
                  const dayMeals = getMealsForDay(day.dayIndex)
                  return (
                    <div key={day.dayIndex} className="border border-orange-200 rounded-lg overflow-hidden">
                      {/* Day header */}
                      <div className="px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 border-b border-orange-200">
                        <span className="font-semibold text-gray-900 text-sm">📅 {day.label}</span>
                      </div>

                      {/* Meals for the day */}
                      <div className="p-3 space-y-2">
                        {dayMeals.map(meal => (
                          <div key={`${day.dayIndex}-${meal.meal_type}`} className="flex items-center gap-3">
                            {/* Meal type label */}
                            <span className="w-28 text-sm font-medium text-gray-700 flex-shrink-0">
                              {getMealTypeLabel(meal.meal_type)}
                            </span>

                            {/* Time */}
                            <input
                              type="time"
                              value={meal.time}
                              onChange={(e) => updateMealTime(day.dayIndex, meal.meal_type, e.target.value)}
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-sm flex-shrink-0"
                            />

                            {/* Description - disabled for breakfast (always Bufet) */}
                            {meal.meal_type === 'breakfast' ? (
                              <span className="flex-1 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm italic">
                                Bufet (vždy stejné)
                              </span>
                            ) : (
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={meal.description}
                                  onChange={(e) => updateMealDescription(day.dayIndex, meal.meal_type, e.target.value)}
                                  placeholder="Začni psát nebo klikni na jídlo níže..."
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 text-sm"
                                  list={`meals-${day.dayIndex}-${meal.meal_type}`}
                                />
                                <datalist id={`meals-${day.dayIndex}-${meal.meal_type}`}>
                                  {mealTemplates.map(t => (
                                    <option key={t.id} value={t.name} />
                                  ))}
                                </datalist>
                                {/* Quick select buttons from database - always visible */}
                                {mealTemplates.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {mealTemplates.map(t => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => updateMealDescription(day.dayIndex, meal.meal_type, t.name)}
                                        className={`text-xs px-2 py-1 rounded-full transition-colors border ${meal.description === t.name
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
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {menuEnabled && days.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-700 text-sm">
                  ⬆️ Nejprve vyplňte datum začátku a konce, aby se vypočítaly dny pro jídelníček
                </p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
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
              <h1 className="text-2xl font-bold text-gray-900">Správa eventů</h1>
            </div>

            <button
              onClick={() => {
                resetForm()
                setShowCreateForm(true)
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nový event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Edit form */}
        {editingSession && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">✏️ Upravit event</h3>
            {renderFormFields()}
            <div className="flex gap-4 justify-end mt-4">
              <button
                onClick={cancelEdit}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Zrušit
              </button>
              <button
                onClick={updateSession}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg"
              >
                Uložit změny
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Vytvořit nový event</h3>
            {renderFormFields()}
            <div className="flex gap-4 justify-end mt-4">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Zrušit
              </button>
              <button
                onClick={createSession}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg"
              >
                Vytvořit event
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Název</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Začátek</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konec</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {session.name}
                    {session.menu_enabled && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🍽️ Menu</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {session.slug ? (
                      <Link
                        href={`/event/${session.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        /event/{session.slug}
                      </Link>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(session.start_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {session.end_date ? formatDate(session.end_date) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {session.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                        Aktivní
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                        Neaktivní
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="flex items-center text-purple-600 hover:text-purple-700 font-medium"
                        title="Detail"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detail
                      </Link>
                      <button
                        onClick={() => startEditSession(session)}
                        className="flex items-center text-blue-600 hover:text-blue-700"
                        title="Upravit"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Upravit
                      </button>
                      <button
                        onClick={() => toggleSessionActive(session.id, session.is_active)}
                        className={`flex items-center ${session.is_active
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                          }`}
                      >
                        {session.is_active ? (
                          <>
                            <StopCircle className="w-4 h-4 mr-1" />
                            Ukončit
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-1" />
                            Aktivovat
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}