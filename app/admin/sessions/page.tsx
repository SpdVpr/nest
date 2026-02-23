'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, PlayCircle, StopCircle, Edit, Eye, Trash2, UtensilsCrossed, X, Monitor, Cpu, Gamepad2, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { Session, MealType, HardwareOverride } from '@/types/database.types'
import { formatDate, formatDateOnly } from '@/lib/utils'
import { useAdminAuth } from '@/lib/admin-auth-context'
import { canEditSettings, canCreateEvents } from '@/lib/admin-roles'

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

interface AdminHardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity: number
  is_available: boolean
}

function AdminSessionsPageInner() {
  const router = useRouter()
  const { role } = useAdminAuth()
  const showEdit = role ? canEditSettings(role) : false
  const showCreate = role ? canCreateEvents(role) : false
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
  const [newPricePerNight, setNewPricePerNight] = useState('')
  const [surchargeEnabled, setSurchargeEnabled] = useState(false)

  // Menu state
  const [menuEnabled, setMenuEnabled] = useState(false)
  const [menuItems, setMenuItems] = useState<InlineMenuItem[]>([])
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Hardware state
  const [hardwarePricingEnabled, setHardwarePricingEnabled] = useState(true)
  const [hardwareOverrides, setHardwareOverrides] = useState<Record<string, HardwareOverride>>({})
  const [allHardwareItems, setAllHardwareItems] = useState<AdminHardwareItem[]>([])
  const [showHardwareConfig, setShowHardwareConfig] = useState(false)

  // Copy from previous event
  const [copiedGames, setCopiedGames] = useState<{ name: string }[]>([])
  const [loadingCopy, setLoadingCopy] = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      fetchSessions()
      fetchMealTemplates()
      fetchHardwareItems()

      // Auto-open create form if redirected from dashboard
      if (searchParams.get('create') === 'true') {
        resetForm()
        setShowCreateForm(true)
      }

      // Copy from another session if redirected with copyFrom param
      const copyFromId = searchParams.get('copyFrom')
      if (copyFromId) {
        resetForm()
        setShowCreateForm(true)
        // Small delay to ensure state is initialized
        setTimeout(() => copyFromSession(copyFromId), 300)
      }
    }
  }, [router, searchParams])

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

  const fetchHardwareItems = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/hardware', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAllHardwareItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching hardware items:', error)
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

  const copyFromSession = async (sourceSessionId: string) => {
    if (!sourceSessionId) return
    setLoadingCopy(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/sessions/${sourceSessionId}/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch config')
      const { config } = await res.json()

      // Apply settings
      setNewPricePerNight(config.price_per_night?.toString() || '0')
      setSurchargeEnabled(config.surcharge_enabled || false)
      setHardwarePricingEnabled(config.hardware_pricing_enabled !== false)
      setHardwareOverrides(config.hardware_overrides || {})
      setMenuEnabled(config.menu_enabled || false)

      // Copy menu items (adapt day_index if dates differ)
      if (config.menu_items && config.menu_items.length > 0) {
        const items = config.menu_items.map((item: any) => ({
          day_index: item.day_index || 0,
          meal_type: item.meal_type as MealType,
          time: item.time || '',
          description: item.description || '',
          order: item.order || 0,
        }))
        setMenuItems(items)
      }

      // Store games for later creation
      setCopiedGames(config.games || [])

      alert(`Nastavení zkopírováno! Zkopírováno: cena, HW konfigurace${config.menu_enabled ? ', jídelníček' : ''}${config.games?.length > 0 ? `, ${config.games.length} her` : ''}`)
    } catch (error) {
      console.error('Error copying config:', error)
      alert('Nepodařilo se zkopírovat nastavení')
    } finally {
      setLoadingCopy(false)
    }
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
      sessionData.hardware_pricing_enabled = hardwarePricingEnabled
      sessionData.hardware_overrides = hardwareOverrides
      sessionData.surcharge_enabled = surchargeEnabled

      const priceVal = parseFloat(newPricePerNight)
      sessionData.price_per_night = !isNaN(priceVal) && priceVal >= 0 ? priceVal : 0

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

      // Copy games if any were copied from another session
      if (newSessionId && copiedGames.length > 0) {
        for (const game of copiedGames) {
          await fetch(`/api/admin/sessions/${newSessionId}/games`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: game.name })
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

      const priceVal = parseFloat(newPricePerNight)
      sessionData.price_per_night = !isNaN(priceVal) && priceVal >= 0 ? priceVal : 0
      sessionData.surcharge_enabled = surchargeEnabled

      sessionData.hardware_pricing_enabled = hardwarePricingEnabled
      sessionData.hardware_overrides = hardwareOverrides

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
    setNewPricePerNight((session as any).price_per_night?.toString() || '0')
    setSurchargeEnabled((session as any).surcharge_enabled || false)
    setHardwarePricingEnabled((session as any).hardware_pricing_enabled !== false)
    setHardwareOverrides((session as any).hardware_overrides || {})
    setShowHardwareConfig(false)
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
    setNewPricePerNight('')
    setSurchargeEnabled(false)
    setMenuEnabled(false)
    setMenuItems([])
    setHardwarePricingEnabled(true)
    setHardwareOverrides({})
    setShowHardwareConfig(false)
    setCopiedGames([])
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
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Název eventu *</label>
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="např. LAN Party - Listopad 2025"
            className="w-full px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Datum začátku</label>
            <input
              type="date"
              value={newSessionStartDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="w-full px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Datum konce</label>
            <input
              type="date"
              value={newSessionEndDate || ''}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="w-full px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Čas začátku</label>
            <input
              type="time"
              value={newSessionStartTime}
              onChange={(e) => setNewSessionStartTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Čas konce</label>
            <input
              type="time"
              value={newSessionEndTime}
              onChange={(e) => setNewSessionEndTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Popis eventu</label>
          <textarea
            value={newSessionDescription}
            onChange={(e) => setNewSessionDescription(e.target.value)}
            placeholder="Popis eventu..."
            className="w-full px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nest-text-secondary)' }}>Cena za noc (Kč)</label>
          <input
            type="number"
            value={newPricePerNight}
            onChange={(e) => setNewPricePerNight(e.target.value)}
            placeholder="např. 300"
            min="0"
            className="w-full px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
          />
        </div>

        {/* Surcharge toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={surchargeEnabled}
                onChange={(e) => setSurchargeEnabled(e.target.checked)}
                className="sr-only"
              />
              <div
                className="block w-12 h-7 rounded-full transition-colors"
                style={{ backgroundColor: surchargeEnabled ? '#f59e0b' : 'var(--nest-border)' }}
              ></div>
              <div
                className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full transition-transform ${surchargeEnabled ? 'translate-x-5' : ''}`}
                style={{ backgroundColor: 'var(--nest-text-primary)' }}
              ></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Příplatek pod 10 lidí</span>
            </div>
          </label>
          {surchargeEnabled && (
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
            >
              +150 Kč/noc za každého chybějícího
            </span>
          )}
        </div>

        {surchargeEnabled && (
          <div
            className="rounded-lg p-3 text-sm"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
            }}
          >
            💡 Při méně než 10 účastnících se cena za noc zvýší o 150 Kč za každého chybějícího.
            Např. při 7 lidech: {newPricePerNight ? `${parseInt(newPricePerNight) + 3 * 150} Kč` : '—'} /noc.
          </div>
        )}

        {/* Hardware Configuration Section */}
        <hr style={{ borderColor: 'var(--nest-border)' }} />

        <div className="space-y-4">
          {/* Hardware pricing toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={hardwarePricingEnabled}
                  onChange={(e) => setHardwarePricingEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="block w-12 h-7 rounded-full transition-colors"
                  style={{ backgroundColor: hardwarePricingEnabled ? '#3b82f6' : 'var(--nest-border)' }}
                ></div>
                <div
                  className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full transition-transform ${hardwarePricingEnabled ? 'translate-x-5' : ''}`}
                  style={{ backgroundColor: 'var(--nest-text-primary)' }}
                ></div>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5" style={{ color: '#60a5fa' }} />
                <span className="font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Cena techniky</span>
              </div>
            </label>
            {!hardwarePricingEnabled && (
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }}
              >
                🚫 Cena techniky nebude zobrazena hostům
              </span>
            )}
          </div>

          {!hardwarePricingEnabled && (
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                color: '#fbbf24',
              }}
            >
              💡 Hostům nebudou vidět ceny za hardware. Technika se jim nebude počítat do nákladů.
              Využij na akce, kde je technika v ceně.
            </div>
          )}

          {/* Hardware quantity overrides */}
          <div>
            <button
              onClick={() => setShowHardwareConfig(!showHardwareConfig)}
              className="flex items-center gap-2 font-medium text-sm transition-colors"
              style={{ color: '#60a5fa' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#93bbfd')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
            >
              <Cpu className="w-4 h-4" />
              {showHardwareConfig ? 'Skrýt úpravy HW' : '🖥️ Upravit dostupnost HW pro tuto akci'}
              {showHardwareConfig
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
              {Object.keys(hardwareOverrides).length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: 'rgba(96, 165, 250, 0.2)', color: '#93bbfd' }}
                >
                  {Object.keys(hardwareOverrides).length} změn
                </span>
              )}
            </button>
          </div>

          {showHardwareConfig && (
            <div
              className="rounded-lg p-4 space-y-3"
              style={{
                backgroundColor: 'var(--nest-bg)',
                border: '1px solid var(--nest-border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--nest-text-primary)' }}>
                  🖥️ Úpravy dostupnosti HW
                  <span className="text-sm font-normal" style={{ color: 'var(--nest-text-secondary)' }}>
                    (změň počet kusů pro tuto akci)
                  </span>
                </h4>
                {Object.keys(hardwareOverrides).length > 0 && (
                  <button
                    onClick={() => setHardwareOverrides({})}
                    className="text-xs font-medium underline transition-colors"
                    style={{ color: '#f87171' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fca5a5')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#f87171')}
                  >
                    Resetovat vše
                  </button>
                )}
              </div>

              <p className="text-xs mb-3" style={{ color: 'var(--nest-text-secondary)' }}>
                ⚠️ Zde můžeš omezit počet kusů pro tuto konkrétní akci.
                Nastav 0 pro úplné skrytí dané položky. Pokud pole nevyplníš, použije se výchozí počet.
              </p>

              {/* Group by type */}
              {(() => {
                const grouped: Record<string, AdminHardwareItem[]> = {}
                allHardwareItems.filter(i => i.is_available).forEach(item => {
                  const label = item.type === 'monitor' ? '📺 Monitory' : item.type === 'pc' ? '💻 Počítače' : '🎮 Příslušenství'
                  if (!grouped[label]) grouped[label] = []
                  grouped[label].push(item)
                })

                return Object.entries(grouped).map(([groupLabel, items]) => (
                  <div key={groupLabel}>
                    <h5 className="text-sm font-semibold mb-2" style={{ color: 'var(--nest-text-primary)' }}>{groupLabel}</h5>
                    <div className="space-y-2">
                      {items.map(item => {
                        const hasOverride = hardwareOverrides[item.id] !== undefined
                        const overrideQty = hasOverride ? hardwareOverrides[item.id].quantity : null
                        const isReduced = hasOverride && overrideQty !== null && overrideQty < item.quantity
                        const isDisabled = hasOverride && overrideQty === 0

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                            style={{
                              backgroundColor: isDisabled
                                ? 'rgba(239, 68, 68, 0.1)'
                                : isReduced
                                  ? 'rgba(251, 191, 36, 0.1)'
                                  : 'var(--nest-surface)',
                              border: `1px solid ${isDisabled ? 'rgba(239, 68, 68, 0.3)'
                                : isReduced ? 'rgba(251, 191, 36, 0.3)'
                                  : 'var(--nest-border)'
                                }`,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm font-medium ${isDisabled ? 'line-through' : ''}`}
                                style={{ color: isDisabled ? '#f87171' : 'var(--nest-text-primary)' }}
                              >
                                {item.name}
                              </span>
                              <span className="text-xs ml-2" style={{ color: 'var(--nest-text-tertiary)' }}>
                                (výchozí: {item.quantity} ks • {item.price_per_night} Kč/noc)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="number"
                                value={overrideQty !== null ? overrideQty : ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (val === '' || val === undefined) {
                                    const copy = { ...hardwareOverrides }
                                    delete copy[item.id]
                                    setHardwareOverrides(copy)
                                  } else {
                                    const num = Math.max(0, Math.min(parseInt(val) || 0, item.quantity))
                                    setHardwareOverrides({
                                      ...hardwareOverrides,
                                      [item.id]: { quantity: num }
                                    })
                                  }
                                }}
                                placeholder={`${item.quantity}`}
                                min="0"
                                max={item.quantity}
                                className="w-20 px-2 py-1 rounded-lg text-sm text-center font-medium"
                                style={{
                                  backgroundColor: 'var(--nest-bg)',
                                  border: `1px solid ${isDisabled ? 'rgba(239, 68, 68, 0.4)'
                                    : isReduced ? 'rgba(251, 191, 36, 0.4)'
                                      : 'var(--nest-border)'
                                    }`,
                                  color: isDisabled ? '#f87171'
                                    : isReduced ? '#fbbf24'
                                      : 'var(--nest-text-primary)',
                                }}
                              />
                              <span className="text-xs w-6" style={{ color: 'var(--nest-text-tertiary)' }}>ks</span>
                              {hasOverride && (
                                <button
                                  onClick={() => {
                                    const copy = { ...hardwareOverrides }
                                    delete copy[item.id]
                                    setHardwareOverrides(copy)
                                  }}
                                  className="transition-colors"
                                  style={{ color: 'var(--nest-text-tertiary)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nest-text-tertiary)')}
                                  title="Zrušit úpravu"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
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
                  <div className={`absolute left-0.5 top-0.5 bg-[#efefef] w-6 h-6 rounded-full transition-transform ${menuEnabled ? 'translate-x-5' : ''}`}></div>
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
                    <div key={template.id} className="flex items-center gap-1 bg-[#efefef] border border-orange-200 rounded-full px-3 py-1">
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
              <h1 className="text-2xl font-bold text-gray-900">Správa eventů</h1>
            </div>

            {showCreate && (
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
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Edit form */}
        {editingSession && showEdit && (
          <div className="rounded-xl shadow p-6 mb-6" style={{ backgroundColor: 'var(--nest-surface)', border: '2px solid var(--nest-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--nest-text-primary)' }}>✏️ Upravit event</h3>
            {renderFormFields()}
            <div className="flex gap-4 justify-end mt-4">
              <button
                onClick={cancelEdit}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)', backgroundColor: 'var(--nest-bg)' }}
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

        {showCreateForm && showCreate && (
          <div className="rounded-xl shadow p-6 mb-6" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--nest-text-primary)' }}>Vytvořit nový event</h3>
            {copiedGames.length > 0 && (
              <p className="text-xs text-green-600 mb-3 font-medium">✅ Zkopírováno nastavení + {copiedGames.length} her z předchozí akce</p>
            )}
            {renderFormFields()}
            <div className="flex gap-4 justify-end mt-4">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)', backgroundColor: 'var(--nest-bg)' }}
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

        <div className="bg-[#efefef] rounded-xl shadow overflow-hidden">
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
                    {session.hardware_pricing_enabled === false && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🚫 HW cena</span>
                    )}
                    {session.hardware_overrides && Object.keys(session.hardware_overrides).length > 0 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🖥️ HW úpravy</span>
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
                      {showEdit && (
                        <button
                          onClick={() => startEditSession(session)}
                          className="flex items-center text-blue-600 hover:text-blue-700"
                          title="Upravit"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Upravit
                        </button>
                      )}
                      {showEdit && (
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
                      )}
                      {showCreate && (
                        <button
                          onClick={() => {
                            resetForm()
                            copyFromSession(session.id)
                            setShowCreateForm(true)
                            setEditingSession(null)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="flex items-center text-gray-500 hover:text-gray-700"
                          title="Vytvořit nový event s nastavením tohoto"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Kopírovat
                        </button>
                      )}
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

export default function AdminSessionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <AdminSessionsPageInner />
    </Suspense>
  )
}