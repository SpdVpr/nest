'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, QrCode, Check, Clock, AlertTriangle, Plus, X, Edit2, Save, Copy, CreditCard, Settings, Download, ChevronDown, ChevronUp, Banknote, Heart, Loader2, CheckSquare, Square, BarChart3 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface ConsumptionItem {
    name: string
    category: string
    qty: number
    unitPrice: number
    totalPrice: number
}

interface HardwareItem {
    name: string
    qty: number
    totalPrice: number
    type: string
}

interface GuestCost {
    id: string
    name: string
    nights_count: number
    nightsTotal: number
    consumption: ConsumptionItem[]
    snacksTotal: number
    hardware: HardwareItem[]
    hwTotal: number
    tip: number
    tipPercentage: number | null
    deposit: number
    grandTotal: number
}

interface Adjustment {
    label: string
    amount: number
}

interface CustomItem {
    label: string
    amount: number
}

interface Settlement {
    id?: string
    status: 'draft' | 'pending' | 'paid'
    adjustments: Adjustment[]
    custom_items: CustomItem[]
    overrides: Record<string, number>
    notes: string
    variable_symbol: string
    qr_generated_at: string | null
    paid_at: string | null
}

interface BankSettings {
    bank_account: string
    bank_iban: string
    account_holder: string
}

export default function SettlementPage() {
    const router = useRouter()
    const params = useParams()
    const sessionId = params?.id as string

    const [session, setSession] = useState<any>(null)
    const [guests, setGuests] = useState<GuestCost[]>([])
    const [settlements, setSettlements] = useState<Record<string, Settlement>>({})
    const [bankSettings, setBankSettings] = useState<BankSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedGuest, setExpandedGuest] = useState<string | null>(null)
    const [showQR, setShowQR] = useState<string | null>(null)

    // Collapsible stats
    const [showStats, setShowStats] = useState(false)

    // Multi-select for QR
    const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())

    // Admin tip editing
    const [tipEditGuest, setTipEditGuest] = useState<string | null>(null)
    const [tipFinalAmount, setTipFinalAmount] = useState('')
    const [tipSaving, setTipSaving] = useState(false)

    // Bank settings edit
    const [editingBank, setEditingBank] = useState(false)
    const [bankAccount, setBankAccount] = useState('')
    const [accountHolder, setAccountHolder] = useState('')
    const [bankSaving, setBankSaving] = useState(false)

    // Adjustment edit
    const [addingAdjustment, setAddingAdjustment] = useState<string | null>(null)
    const [adjLabel, setAdjLabel] = useState('')
    const [adjAmount, setAdjAmount] = useState('')

    // Notes edit
    const [editingNotes, setEditingNotes] = useState<string | null>(null)
    const [notesValue, setNotesValue] = useState('')

    // Inline item editing
    const [editingItemKey, setEditingItemKey] = useState<string | null>(null)
    const [editingItemValue, setEditingItemValue] = useState('')

    // Custom cost item
    const [addingCustomItem, setAddingCustomItem] = useState<string | null>(null)
    const [customLabel, setCustomLabel] = useState('')
    const [customAmount, setCustomAmount] = useState('')

    const [saving, setSaving] = useState(false)
    const [pricePerNight, setPricePerNight] = useState(0)

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
        } else {
            fetchData()
        }
    }, [sessionId])

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

                // Fetch costs using session slug
                const slug = data.session?.slug || sessionId
                const costsRes = await fetch(`/api/event/${slug}/costs`)
                if (costsRes.ok) {
                    const costsData = await costsRes.json()
                    setGuests(costsData.guests || [])
                    setPricePerNight(costsData.pricePerNight || 0)
                }
            }

            // Fetch settlement data
            const settlementRes = await fetch(`/api/admin/sessions/${sessionId}/settlement`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (settlementRes.ok) {
                const data = await settlementRes.json()
                setSettlements(data.settlements || {})
                if (data.bankSettings) {
                    setBankSettings(data.bankSettings)
                    setBankAccount(data.bankSettings.bank_account || '')
                    setAccountHolder(data.bankSettings.account_holder || '')
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getSettlement = (guestId: string): Settlement => {
        return settlements[guestId] || {
            status: 'draft',
            adjustments: [],
            custom_items: [],
            overrides: {},
            notes: '',
            variable_symbol: '',
            qr_generated_at: null,
            paid_at: null,
        }
    }

    const getAdjustmentsTotal = (guestId: string): number => {
        const s = getSettlement(guestId)
        return s.adjustments.reduce((sum, a) => sum + a.amount, 0)
    }

    // Get the effective value for a line item (override or original)
    const getItemValue = (guestId: string, key: string, originalValue: number): number => {
        const s = getSettlement(guestId)
        if (s.overrides && key in s.overrides) {
            return s.overrides[key]
        }
        return originalValue
    }

    // Calculate grand total with overrides applied
    const getOverriddenGrandTotal = (guest: GuestCost): number => {
        const s = getSettlement(guest.id)
        const overrides = s.overrides || {}

        const nightsVal = 'accommodation' in overrides ? overrides['accommodation'] : guest.nightsTotal
        const tipVal = 'tip' in overrides ? overrides['tip'] : guest.tip

        let consumptionVal = 0
        guest.consumption.forEach((item, idx) => {
            const key = `consumption-${idx}`
            consumptionVal += key in overrides ? overrides[key] : item.totalPrice
        })

        let hardwareVal = 0
        guest.hardware.forEach((item, idx) => {
            const key = `hardware-${idx}`
            hardwareVal += key in overrides ? overrides[key] : item.totalPrice
        })

        const customItemsVal = (s.custom_items || []).reduce((sum: number, ci: CustomItem) => sum + ci.amount, 0)

        return nightsVal + consumptionVal + hardwareVal + tipVal + customItemsVal
    }

    const getFinalTotal = (guest: GuestCost): number => {
        const subtotal = getOverriddenGrandTotal(guest) + getAdjustmentsTotal(guest.id)
        const afterDeposit = subtotal - (guest.deposit || 0)
        return Math.max(0, afterDeposit)
    }

    // Start editing a line item
    const startEditItem = (guestId: string, key: string, currentValue: number) => {
        setEditingItemKey(`${guestId}:${key}`)
        setEditingItemValue(currentValue.toString())
    }

    // Save an item override
    const saveItemOverride = async (guestId: string, key: string) => {
        const newValue = parseFloat(editingItemValue)
        if (isNaN(newValue) || newValue < 0) return

        const settlement = getSettlement(guestId)
        const newOverrides = { ...(settlement.overrides || {}), [key]: newValue }

        await settlementAction(guestId, 'update', { overrides: newOverrides })
        setEditingItemKey(null)
    }

    // Remove an override (revert to original)
    const removeItemOverride = async (guestId: string, key: string) => {
        const settlement = getSettlement(guestId)
        const newOverrides = { ...(settlement.overrides || {}) }
        delete newOverrides[key]

        await settlementAction(guestId, 'update', { overrides: newOverrides })
    }

    // Add a custom cost item
    const addCustomItem = async (guestId: string) => {
        const amount = parseFloat(customAmount)
        if (!customLabel.trim() || isNaN(amount) || amount <= 0) return

        const settlement = getSettlement(guestId)
        const newCustomItems = [...(settlement.custom_items || []), { label: customLabel, amount }]

        await settlementAction(guestId, 'update', { custom_items: newCustomItems })
        setAddingCustomItem(null)
        setCustomLabel('')
        setCustomAmount('')
    }

    // Remove a custom cost item
    const removeCustomItem = async (guestId: string, index: number) => {
        const settlement = getSettlement(guestId)
        const newCustomItems = (settlement.custom_items || []).filter((_: CustomItem, i: number) => i !== index)
        await settlementAction(guestId, 'update', { custom_items: newCustomItems })
    }

    // Generate variable symbol from session date + guest index
    const generateVS = (guestIndex: number): string => {
        const date = session?.start_date ? new Date(session.start_date) : new Date()
        const yy = date.getFullYear().toString().slice(2)
        const mm = (date.getMonth() + 1).toString().padStart(2, '0')
        const dd = date.getDate().toString().padStart(2, '0')
        return `${yy}${mm}${dd}${(guestIndex + 1).toString().padStart(3, '0')}`
    }

    // Generate SPAYD payment string
    const generateSPAYD = (guest: GuestCost, guestIndex: number): string => {
        if (!bankSettings?.bank_iban) return ''

        const amount = getFinalTotal(guest).toFixed(2)
        const vs = getSettlement(guest.id).variable_symbol || generateVS(guestIndex)

        // Strip diacritics and convert to uppercase for QR alphanumeric mode
        const rawMsg = `${session?.name || 'LAN'} - ${guest.name}`
        const cleanMsg = rawMsg
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9 \-.,/:]/g, '')
            .replace(/\s+/g, ' ')  // collapse multiple spaces
            .trim()
            .toUpperCase()
            .substring(0, 60)

        const iban = bankSettings.bank_iban.replace(/\s/g, '')

        return `SPD*1.0*ACC:${iban}*AM:${amount}*CC:CZK*MSG:${cleanMsg}*X-VS:${vs}`
    }

    // Build official QR Platba API URL for image
    const getQRImageUrl = (guest: GuestCost, guestIndex: number): string => {
        if (!bankSettings?.bank_account) return ''

        const amount = getFinalTotal(guest).toFixed(2)
        const vs = getSettlement(guest.id).variable_symbol || generateVS(guestIndex)

        const rawMsg = `${session?.name || 'LAN'} - ${guest.name}`
        const cleanMsg = rawMsg
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9 \-.,/:]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase()
            .substring(0, 60)

        // Parse the Czech account number
        const account = bankSettings.bank_account.trim()
        const [accountPart, bankCode] = account.split('/')
        if (!bankCode) return ''

        let prefix = ''
        let number = accountPart
        if (accountPart.includes('-')) {
            [prefix, number] = accountPart.split('-')
        }

        const params = new URLSearchParams({
            accountNumber: number,
            bankCode: bankCode,
            amount: amount,
            currency: 'CZK',
            vs: vs,
            message: cleanMsg,
            size: '250',
        })
        if (prefix) params.set('accountPrefix', prefix)

        return `https://api.paylibo.com/paylibo/generator/czech/image?${params.toString()}`
    }

    // Save bank settings
    const saveBankSettings = async () => {
        setBankSaving(true)
        try {
            const token = localStorage.getItem('admin_token')
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bank_account: bankAccount,
                    account_holder: accountHolder,
                }),
            })

            if (res.ok) {
                const data = await res.json()
                setBankSettings({
                    bank_account: bankAccount,
                    bank_iban: data.iban || '',
                    account_holder: accountHolder,
                })
                setEditingBank(false)
            }
        } catch (error) {
            console.error('Error saving bank settings:', error)
        } finally {
            setBankSaving(false)
        }
    }

    // Settlement actions
    const settlementAction = async (guestId: string, action: string, extra: any = {}) => {
        setSaving(true)
        try {
            const token = localStorage.getItem('admin_token')
            const guestIndex = guests.findIndex(g => g.id === guestId)

            const body: any = {
                guest_id: guestId,
                action,
                ...extra,
            }

            if (action === 'generate_qr') {
                const settlement = getSettlement(guestId)
                body.variable_symbol = settlement.variable_symbol || generateVS(guestIndex)
                body.adjustments = settlement.adjustments || []
            }

            await fetch(`/api/admin/sessions/${sessionId}/settlement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            })

            await fetchData()
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setSaving(false)
        }
    }

    // Add adjustment
    const addAdjustment = async (guestId: string) => {
        const amount = parseFloat(adjAmount)
        if (!adjLabel.trim() || isNaN(amount)) return

        const settlement = getSettlement(guestId)
        const newAdjustments = [...settlement.adjustments, { label: adjLabel, amount }]

        await settlementAction(guestId, 'update', { adjustments: newAdjustments })
        setAddingAdjustment(null)
        setAdjLabel('')
        setAdjAmount('')
    }

    // Remove adjustment
    const removeAdjustment = async (guestId: string, index: number) => {
        const settlement = getSettlement(guestId)
        const newAdjustments = settlement.adjustments.filter((_, i) => i !== index)
        await settlementAction(guestId, 'update', { adjustments: newAdjustments })
    }

    // Save notes
    const saveNotes = async (guestId: string) => {
        await settlementAction(guestId, 'update', { notes: notesValue })
        setEditingNotes(null)
    }

    // Generate all QR codes
    const generateAllQR = async () => {
        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i]
            const settlement = getSettlement(guest.id)
            if (settlement.status !== 'paid') {
                await settlementAction(guest.id, 'generate_qr')
            }
        }
    }

    // Generate QR for selected guests
    const generateSelectedQR = async () => {
        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i]
            if (selectedGuests.has(guest.id)) {
                const settlement = getSettlement(guest.id)
                if (settlement.status !== 'paid') {
                    await settlementAction(guest.id, 'generate_qr')
                }
            }
        }
        setSelectedGuests(new Set())
    }

    // Toggle guest selection
    const toggleGuestSelection = (guestId: string) => {
        setSelectedGuests(prev => {
            const next = new Set(prev)
            if (next.has(guestId)) {
                next.delete(guestId)
            } else {
                next.add(guestId)
            }
            return next
        })
    }

    // Select/deselect all
    const toggleSelectAll = () => {
        if (selectedGuests.size === guests.filter(g => getSettlement(g.id).status !== 'paid').length) {
            setSelectedGuests(new Set())
        } else {
            setSelectedGuests(new Set(guests.filter(g => getSettlement(g.id).status !== 'paid').map(g => g.id)))
        }
    }

    // Admin tip: compute current subtotal without tip to calculate tip from final amount
    const getSubtotalWithoutTip = (guest: GuestCost): number => {
        const s = getSettlement(guest.id)
        const overrides = s.overrides || {}

        const nightsVal = 'accommodation' in overrides ? overrides['accommodation'] : guest.nightsTotal

        let consumptionVal = 0
        guest.consumption.forEach((item, idx) => {
            const key = `consumption-${idx}`
            consumptionVal += key in overrides ? overrides[key] : item.totalPrice
        })

        let hardwareVal = 0
        guest.hardware.forEach((item, idx) => {
            const key = `hardware-${idx}`
            hardwareVal += key in overrides ? overrides[key] : item.totalPrice
        })

        const customItemsVal = (s.custom_items || []).reduce((sum: number, ci: CustomItem) => sum + ci.amount, 0)

        return nightsVal + consumptionVal + hardwareVal + customItemsVal
    }

    // Save admin tip
    const saveAdminTip = async (guest: GuestCost) => {
        const finalAmount = parseInt(tipFinalAmount) || 0
        const subtotalWithoutTip = getSubtotalWithoutTip(guest)
        const tipAmount = Math.max(0, finalAmount - subtotalWithoutTip)

        setTipSaving(true)
        try {
            const token = localStorage.getItem('admin_token')
            const slug = session?.slug || sessionId
            const res = await fetch(`/api/event/${slug}/tips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    guest_id: guest.id,
                    amount: tipAmount,
                    percentage: null,
                }),
            })
            if (res.ok) {
                setTipEditGuest(null)
                setTipFinalAmount('')
                await fetchData()
            }
        } catch (error) {
            console.error('Error saving tip:', error)
        } finally {
            setTipSaving(false)
        }
    }

    // Remove admin tip
    const removeAdminTip = async (guest: GuestCost) => {
        setTipSaving(true)
        try {
            const slug = session?.slug || sessionId
            await fetch(`/api/event/${slug}/tips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guest_id: guest.id, amount: 0 }),
            })
            setTipEditGuest(null)
            setTipFinalAmount('')
            await fetchData()
        } catch (error) {
            console.error('Error removing tip:', error)
        } finally {
            setTipSaving(false)
        }
    }

    // Copy payment info
    const copyPaymentInfo = (guest: GuestCost, index: number) => {
        const total = getFinalTotal(guest)
        const vs = getSettlement(guest.id).variable_symbol || generateVS(index)
        const text = `Platba za ${session?.name || 'LAN Party'}\nJméno: ${guest.name}\nČástka: ${total.toLocaleString('cs-CZ')} Kč\nÚčet: ${bankSettings?.bank_account || ''}\nVS: ${vs}`
        navigator.clipboard.writeText(text)
    }

    // Summary stats
    const totalToCollect = guests.reduce((sum, g) => sum + getFinalTotal(g), 0)
    const totalPaid = guests
        .filter(g => getSettlement(g.id).status === 'paid')
        .reduce((sum, g) => sum + getFinalTotal(g), 0)
    const pendingCount = guests.filter(g => getSettlement(g.id).status === 'pending').length
    const paidCount = guests.filter(g => getSettlement(g.id).status === 'paid').length
    const totalRemaining = totalToCollect - totalPaid

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold"><Check className="w-3 h-3" /> Zaplaceno</span>
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold"><Clock className="w-3 h-3" /> Čeká na platbu</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">Návrh</span>
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href={`/admin/sessions/${sessionId}`}
                                className="flex items-center text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Zpět
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">💳 Vyúčtování</h1>
                                <p className="text-sm text-gray-500">{session?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedGuests.size > 0 && (
                                <button
                                    onClick={generateSelectedQR}
                                    disabled={saving || !bankSettings?.bank_iban}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <QrCode className="w-4 h-4" />
                                    QR pro označené ({selectedGuests.size})
                                </button>
                            )}
                            <button
                                onClick={generateAllQR}
                                disabled={saving || !bankSettings?.bank_iban}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <QrCode className="w-4 h-4" />
                                QR pro všechny
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* Bank Account Settings */}
                <div className={`rounded-xl p-5 ${bankSettings?.bank_account ? 'bg-white shadow' : 'bg-red-50 border-2 border-red-200'}`}>
                    {editingBank ? (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Bankovní účet pro platby
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Číslo účtu</label>
                                    <input
                                        type="text"
                                        value={bankAccount}
                                        onChange={(e) => setBankAccount(e.target.value)}
                                        placeholder="např. 123456789/0800"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Formát: číslo_účtu/kód_banky nebo předčíslí-číslo/kód</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jméno majitele účtu</label>
                                    <input
                                        type="text"
                                        value={accountHolder}
                                        onChange={(e) => setAccountHolder(e.target.value)}
                                        placeholder="Jan Novák"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setEditingBank(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Zrušit
                                </button>
                                <button
                                    onClick={saveBankSettings}
                                    disabled={bankSaving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {bankSaving ? 'Ukládám...' : 'Uložit'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Banknote className={`w-5 h-5 ${bankSettings?.bank_account ? 'text-green-600' : 'text-red-500'}`} />
                                {bankSettings?.bank_account ? (
                                    <div>
                                        <span className="font-semibold text-gray-900">{bankSettings.bank_account}</span>
                                        {bankSettings.account_holder && (
                                            <span className="text-gray-500 ml-2">({bankSettings.account_holder})</span>
                                        )}
                                        {bankSettings.bank_iban && (
                                            <span className="text-xs text-gray-400 ml-3">IBAN: {bankSettings.bank_iban}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <span className="font-semibold text-red-700">⚠️ Bankovní účet není nastaven</span>
                                        <p className="text-sm text-red-600">Bez účtu nelze generovat QR kódy k platbě</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setEditingBank(true)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                            >
                                <Edit2 className="w-4 h-4" />
                                {bankSettings?.bank_account ? 'Upravit' : 'Nastavit účet'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary Cards - Collapsible */}
                <div className="bg-white rounded-xl shadow">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-xl"
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">Statistiky</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: paidCount === guests.length ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: paidCount === guests.length ? '#22c55e' : '#3b82f6' }}>
                                {paidCount}/{guests.length}
                            </span>
                        </div>
                        {showStats ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                    {showStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-gray-500 uppercase font-medium">Celkem k výběru</p>
                                <p className="text-2xl font-bold text-gray-900">{totalToCollect.toLocaleString('cs-CZ')} Kč</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-green-600 uppercase font-medium">Zaplaceno</p>
                                <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString('cs-CZ')} Kč</p>
                                <p className="text-xs text-gray-400">{paidCount} z {guests.length} hostů</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-amber-600 uppercase font-medium">Čeká na platbu</p>
                                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                                <p className="text-xs text-gray-400">hostů</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs text-red-600 uppercase font-medium">Zbývá vybrat</p>
                                <p className="text-2xl font-bold text-red-600">{totalRemaining.toLocaleString('cs-CZ')} Kč</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Select All / Deselect All */}
                {guests.length > 0 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            {selectedGuests.size === guests.filter(g => getSettlement(g.id).status !== 'paid').length && selectedGuests.size > 0 ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {selectedGuests.size > 0 ? `Označeno ${selectedGuests.size} hostů` : 'Označit všechny'}
                        </button>
                        {selectedGuests.size > 0 && (
                            <button
                                onClick={() => setSelectedGuests(new Set())}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Zrušit výběr
                            </button>
                        )}
                    </div>
                )}

                {/* Guest Settlement Cards */}
                <div className="space-y-3">
                    {guests.map((guest, guestIndex) => {
                        const settlement = getSettlement(guest.id)
                        const isExpanded = expandedGuest === guest.id
                        const finalTotal = getFinalTotal(guest)
                        const adjustmentsTotal = getAdjustmentsTotal(guest.id)
                        const spayd = generateSPAYD(guest, guestIndex)

                        return (
                            <div
                                key={guest.id}
                                className={`bg-white rounded-xl shadow overflow-hidden transition-all ${settlement.status === 'paid' ? 'ring-2 ring-green-200' :
                                    settlement.status === 'pending' ? 'ring-2 ring-amber-200' : ''
                                    }`}
                            >
                                {/* Summary row */}
                                <div
                                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedGuest(isExpanded ? null : guest.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Selection checkbox */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleGuestSelection(guest.id)
                                            }}
                                            className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            {selectedGuests.has(guest.id) ? (
                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${settlement.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            settlement.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {guest.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{guest.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {getStatusBadge(settlement.status)}
                                                {settlement.paid_at && (
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(settlement.paid_at).toLocaleDateString('cs-CZ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xl font-bold ${settlement.status === 'paid' ? 'text-green-600' : 'text-gray-900'
                                            }`}>
                                            {finalTotal.toLocaleString('cs-CZ')} Kč
                                        </span>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 border-t border-gray-100">
                                        {/* Cost breakdown */}
                                        <div className="mt-4 space-y-1">
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                Rozpis nákladů
                                                <button
                                                    onClick={() => {
                                                        setAddingCustomItem(guest.id)
                                                        setCustomLabel('')
                                                        setCustomAmount('')
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 normal-case"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Přidat náklad
                                                </button>
                                            </h4>

                                            {/* Accommodation */}
                                            {guest.nightsTotal > 0 && (() => {
                                                const itemKey = 'accommodation'
                                                const fullKey = `${guest.id}:${itemKey}`
                                                const isEditing = editingItemKey === fullKey
                                                const hasOverride = (settlement.overrides || {})[itemKey] !== undefined
                                                const effectiveValue = getItemValue(guest.id, itemKey, guest.nightsTotal)

                                                return (
                                                    <div className={`flex items-center justify-between py-1.5 text-sm group rounded-lg px-2 -mx-2 ${hasOverride ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">🏠</span>
                                                            <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 font-bold text-xs rounded px-1.5 py-0.5 min-w-[28px]">{guest.nights_count}×</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-900 font-medium">Ubytování</span>
                                                                <span className="text-xs text-gray-400">{pricePerNight} Kč / noc</span>
                                                            </div>
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={editingItemValue}
                                                                    onChange={(e) => setEditingItemValue(e.target.value)}
                                                                    className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-gray-900 text-right"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') saveItemOverride(guest.id, itemKey)
                                                                        if (e.key === 'Escape') setEditingItemKey(null)
                                                                    }}
                                                                />
                                                                <span className="text-gray-400 text-xs">Kč</span>
                                                                <button onClick={() => saveItemOverride(guest.id, itemKey)} className="text-green-600 hover:text-green-700 p-0.5"><Check className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => setEditingItemKey(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                {hasOverride && (
                                                                    <span className="text-xs text-gray-400 line-through">{guest.nightsTotal.toLocaleString('cs-CZ')}</span>
                                                                )}
                                                                <span className={`font-medium ${hasOverride ? 'text-amber-700' : 'text-gray-900'}`}>{effectiveValue.toLocaleString('cs-CZ')} Kč</span>
                                                                <button
                                                                    onClick={() => startEditItem(guest.id, itemKey, effectiveValue)}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-0.5"
                                                                    title="Upravit částku"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                {hasOverride && (
                                                                    <button
                                                                        onClick={() => removeItemOverride(guest.id, itemKey)}
                                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                                                        title="Vrátit původní"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}

                                            {/* Consumption */}
                                            {guest.consumption.map((item, idx) => {
                                                const itemKey = `consumption-${idx}`
                                                const fullKey = `${guest.id}:${itemKey}`
                                                const isEditing = editingItemKey === fullKey
                                                const hasOverride = (settlement.overrides || {})[itemKey] !== undefined
                                                const effectiveValue = getItemValue(guest.id, itemKey, item.totalPrice)

                                                return (
                                                    <div key={idx} className={`flex items-center justify-between py-1.5 text-sm group rounded-lg px-2 -mx-2 ${hasOverride ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">🍕</span>
                                                            <span className="inline-flex items-center justify-center bg-orange-100 text-orange-700 font-bold text-xs rounded px-1.5 py-0.5 min-w-[28px]">{item.qty}×</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-900 font-medium">{item.name}</span>
                                                                <span className="text-xs text-gray-400">{item.unitPrice} Kč / ks</span>
                                                            </div>
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={editingItemValue}
                                                                    onChange={(e) => setEditingItemValue(e.target.value)}
                                                                    className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-gray-900 text-right"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') saveItemOverride(guest.id, itemKey)
                                                                        if (e.key === 'Escape') setEditingItemKey(null)
                                                                    }}
                                                                />
                                                                <span className="text-gray-400 text-xs">Kč</span>
                                                                <button onClick={() => saveItemOverride(guest.id, itemKey)} className="text-green-600 hover:text-green-700 p-0.5"><Check className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => setEditingItemKey(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                {hasOverride && (
                                                                    <span className="text-xs text-gray-400 line-through">{item.totalPrice.toLocaleString('cs-CZ')}</span>
                                                                )}
                                                                <span className={`font-medium ${hasOverride ? 'text-amber-700' : 'text-gray-900'}`}>{effectiveValue.toLocaleString('cs-CZ')} Kč</span>
                                                                <button
                                                                    onClick={() => startEditItem(guest.id, itemKey, effectiveValue)}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-0.5"
                                                                    title="Upravit částku"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                {hasOverride && (
                                                                    <button
                                                                        onClick={() => removeItemOverride(guest.id, itemKey)}
                                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                                                        title="Vrátit původní"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            {/* Hardware */}
                                            {guest.hardware.map((item, idx) => {
                                                const itemKey = `hardware-${idx}`
                                                const fullKey = `${guest.id}:${itemKey}`
                                                const isEditing = editingItemKey === fullKey
                                                const hasOverride = (settlement.overrides || {})[itemKey] !== undefined
                                                const effectiveValue = getItemValue(guest.id, itemKey, item.totalPrice)

                                                return (
                                                    <div key={idx} className={`flex items-center justify-between py-1.5 text-sm group rounded-lg px-2 -mx-2 ${hasOverride ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">💻</span>
                                                            <span className="inline-flex items-center justify-center bg-purple-100 text-purple-700 font-bold text-xs rounded px-1.5 py-0.5 min-w-[28px]">{item.qty}×</span>
                                                            <span className="text-gray-900 font-medium">{item.name}</span>
                                                        </div>
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={editingItemValue}
                                                                    onChange={(e) => setEditingItemValue(e.target.value)}
                                                                    className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-gray-900 text-right"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') saveItemOverride(guest.id, itemKey)
                                                                        if (e.key === 'Escape') setEditingItemKey(null)
                                                                    }}
                                                                />
                                                                <span className="text-gray-400 text-xs">Kč</span>
                                                                <button onClick={() => saveItemOverride(guest.id, itemKey)} className="text-green-600 hover:text-green-700 p-0.5"><Check className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => setEditingItemKey(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                {hasOverride && (
                                                                    <span className="text-xs text-gray-400 line-through">{item.totalPrice.toLocaleString('cs-CZ')}</span>
                                                                )}
                                                                <span className={`font-medium ${hasOverride ? 'text-amber-700' : 'text-gray-900'}`}>{effectiveValue.toLocaleString('cs-CZ')} Kč</span>
                                                                <button
                                                                    onClick={() => startEditItem(guest.id, itemKey, effectiveValue)}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-0.5"
                                                                    title="Upravit částku"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                {hasOverride && (
                                                                    <button
                                                                        onClick={() => removeItemOverride(guest.id, itemKey)}
                                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                                                        title="Vrátit původní"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            {/* Tip - now always show with admin edit capability */}
                                            {(() => {
                                                const itemKey = 'tip'
                                                const fullKey = `${guest.id}:${itemKey}`
                                                const isEditing = editingItemKey === fullKey
                                                const hasOverride = (settlement.overrides || {})[itemKey] !== undefined
                                                const effectiveValue = getItemValue(guest.id, itemKey, guest.tip)
                                                const isTipEditing = tipEditGuest === guest.id
                                                const subtotalNoTip = getSubtotalWithoutTip(guest)

                                                return (
                                                    <div className="space-y-2">
                                                        <div className={`flex items-center justify-between py-1.5 text-sm group rounded-lg px-2 -mx-2 ${hasOverride ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                                                            <span className="text-pink-600 flex items-center gap-1">
                                                                <Heart className="w-3.5 h-3.5 fill-pink-500" />
                                                                Dýško{guest.tipPercentage ? ` (${guest.tipPercentage}%)` : ''}
                                                            </span>
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={editingItemValue}
                                                                        onChange={(e) => setEditingItemValue(e.target.value)}
                                                                        className="w-24 px-2 py-1 border border-blue-300 rounded text-sm text-gray-900 text-right"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveItemOverride(guest.id, itemKey)
                                                                            if (e.key === 'Escape') setEditingItemKey(null)
                                                                        }}
                                                                    />
                                                                    <span className="text-gray-400 text-xs">Kč</span>
                                                                    <button onClick={() => saveItemOverride(guest.id, itemKey)} className="text-green-600 hover:text-green-700 p-0.5"><Check className="w-3.5 h-3.5" /></button>
                                                                    <button onClick={() => setEditingItemKey(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="w-3.5 h-3.5" /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    {effectiveValue > 0 ? (
                                                                        <>
                                                                            {hasOverride && (
                                                                                <span className="text-xs text-gray-400 line-through">{guest.tip.toLocaleString('cs-CZ')}</span>
                                                                            )}
                                                                            <span className={`font-medium ${hasOverride ? 'text-amber-700' : 'text-pink-600'}`}>{effectiveValue.toLocaleString('cs-CZ')} Kč</span>
                                                                            <button
                                                                                onClick={() => startEditItem(guest.id, itemKey, effectiveValue)}
                                                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-0.5"
                                                                                title="Upravit částku"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            {hasOverride && (
                                                                                <button
                                                                                    onClick={() => removeItemOverride(guest.id, itemKey)}
                                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                                                                    title="Vrátit původní"
                                                                                >
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-sm">—</span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setTipEditGuest(guest.id)
                                                                            // Pre-fill with current total (subtotal + existing tip)
                                                                            const currentTotal = subtotalNoTip + effectiveValue
                                                                            setTipFinalAmount(currentTotal > 0 ? currentTotal.toString() : '')
                                                                        }}
                                                                        className="opacity-0 group-hover:opacity-100 text-pink-400 hover:text-pink-600 transition-opacity p-0.5"
                                                                        title={effectiveValue > 0 ? 'Upravit dýško' : 'Přidat dýško'}
                                                                    >
                                                                        <Heart className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Admin tip editor - final amount mode */}
                                                        {isTipEditing && (
                                                            <div className="px-3 -mx-2 py-2 rounded-lg border border-pink-200" style={{ borderLeft: '3px solid #ec4899' }}>
                                                                <p className="text-xs text-pink-600 font-medium mb-2">
                                                                    💖 Zadej finální částku (bez dýška je to {subtotalNoTip.toLocaleString('cs-CZ')} Kč)
                                                                </p>
                                                                <div className="flex gap-2 items-center">
                                                                    <div className="relative flex-1">
                                                                        <input
                                                                            type="number"
                                                                            value={tipFinalAmount}
                                                                            onChange={(e) => setTipFinalAmount(e.target.value)}
                                                                            placeholder={`např. ${Math.ceil(subtotalNoTip / 100) * 100}`}
                                                                            className="w-full pl-3 pr-10 py-2 border border-pink-300 rounded-lg text-sm text-gray-900 text-right focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                                                                            autoFocus
                                                                            min={subtotalNoTip}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') saveAdminTip(guest)
                                                                                if (e.key === 'Escape') { setTipEditGuest(null); setTipFinalAmount('') }
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Kč</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => saveAdminTip(guest)}
                                                                        disabled={tipSaving}
                                                                        className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                                                                    >
                                                                        {tipSaving ? '...' : 'Uložit'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setTipEditGuest(null); setTipFinalAmount('') }}
                                                                        className="text-gray-400 hover:text-gray-600 p-2"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                {/* Quick round buttons */}
                                                                <div className="flex gap-1.5 mt-2">
                                                                    {[...new Set([50, 100, 500, 1000].map(step => Math.ceil(subtotalNoTip / step) * step).filter(v => v > subtotalNoTip))].map(roundedUp => (
                                                                        <button
                                                                            key={roundedUp}
                                                                            onClick={() => setTipFinalAmount(roundedUp.toString())}
                                                                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${tipFinalAmount === roundedUp.toString()
                                                                                ? 'bg-pink-500 text-white border-pink-500'
                                                                                : 'bg-white text-pink-600 border-pink-200 hover:bg-pink-100'
                                                                                }`}
                                                                        >
                                                                            {roundedUp.toLocaleString('cs-CZ')} Kč
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                {/* Show calculated tip */}
                                                                {tipFinalAmount && parseInt(tipFinalAmount) > subtotalNoTip && (
                                                                    <p className="text-xs text-pink-500 mt-1.5">
                                                                        → Dýško bude: {(parseInt(tipFinalAmount) - subtotalNoTip).toLocaleString('cs-CZ')} Kč
                                                                    </p>
                                                                )}
                                                                {/* Remove tip option */}
                                                                {effectiveValue > 0 && (
                                                                    <button
                                                                        onClick={() => removeAdminTip(guest)}
                                                                        className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        Odebrat dýško
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })()}

                                            {/* Custom cost items */}
                                            {(settlement.custom_items || []).map((ci: CustomItem, idx: number) => (
                                                <div key={`custom-${idx}`} className="flex items-center justify-between py-1.5 text-sm group rounded-lg px-2 -mx-2 bg-blue-50">
                                                    <span className="text-blue-700">📌 {ci.label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-blue-700">{ci.amount.toLocaleString('cs-CZ')} Kč</span>
                                                        <button
                                                            onClick={() => removeCustomItem(guest.id, idx)}
                                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                                                            title="Odebrat položku"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add custom item form */}
                                            {addingCustomItem === guest.id && (
                                                <div className="flex gap-2 items-center mt-1 px-2 -mx-2">
                                                    <input
                                                        type="text"
                                                        value={customLabel}
                                                        onChange={(e) => setCustomLabel(e.target.value)}
                                                        placeholder="Název položky"
                                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') addCustomItem(guest.id)
                                                            if (e.key === 'Escape') setAddingCustomItem(null)
                                                        }}
                                                    />
                                                    <input
                                                        type="number"
                                                        value={customAmount}
                                                        onChange={(e) => setCustomAmount(e.target.value)}
                                                        placeholder="Kč"
                                                        className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-right"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') addCustomItem(guest.id)
                                                            if (e.key === 'Escape') setAddingCustomItem(null)
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => addCustomItem(guest.id)}
                                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAddingCustomItem(null)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Subtotal line */}
                                            <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm">
                                                <span className="font-semibold text-gray-700">Mezisoučet</span>
                                                <span className="font-semibold text-gray-900">{getOverriddenGrandTotal(guest).toLocaleString('cs-CZ')} Kč</span>
                                            </div>
                                        </div>

                                        {/* Adjustments */}
                                        <div className="mt-4 space-y-2">
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                                📝 Úpravy
                                                <button
                                                    onClick={() => {
                                                        setAddingAdjustment(guest.id)
                                                        setAdjLabel('')
                                                        setAdjAmount('')
                                                    }}
                                                    className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 normal-case"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Přidat úpravu
                                                </button>
                                            </h4>

                                            {settlement.adjustments.map((adj, idx) => (
                                                <div key={idx} className="flex items-center justify-between py-1 text-sm">
                                                    <span className={adj.amount < 0 ? 'text-green-700' : 'text-red-700'}>{adj.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${adj.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {adj.amount > 0 ? '+' : ''}{adj.amount.toLocaleString('cs-CZ')} Kč
                                                        </span>
                                                        <button
                                                            onClick={() => removeAdjustment(guest.id, idx)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {settlement.adjustments.length === 0 && addingAdjustment !== guest.id && (
                                                <p className="text-xs text-gray-400 italic">Žádné úpravy</p>
                                            )}

                                            {/* Add adjustment form */}
                                            {addingAdjustment === guest.id && (
                                                <div className="flex gap-2 items-center mt-2">
                                                    <input
                                                        type="text"
                                                        value={adjLabel}
                                                        onChange={(e) => setAdjLabel(e.target.value)}
                                                        placeholder="Popis (např. Sleva za pomoc)"
                                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={adjAmount}
                                                        onChange={(e) => setAdjAmount(e.target.value)}
                                                        placeholder="-100"
                                                        className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                    />
                                                    <button
                                                        onClick={() => addAdjustment(guest.id)}
                                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAddingAdjustment(null)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Adjustments total */}
                                            {adjustmentsTotal !== 0 && (
                                                <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Celkem úpravy</span>
                                                    <span className={`font-medium ${adjustmentsTotal < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {adjustmentsTotal > 0 ? '+' : ''}{adjustmentsTotal.toLocaleString('cs-CZ')} Kč
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Deposit */}
                                        {(guest.deposit || 0) > 0 && (
                                            <div className="mt-3 space-y-1">
                                                <div className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 rounded-lg bg-emerald-50">
                                                    <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                                                        💰 Zaplacená záloha
                                                    </span>
                                                    <span className="font-bold text-emerald-600">
                                                        −{(guest.deposit || 0).toLocaleString('cs-CZ')} Kč
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* FINAL TOTAL */}
                                        <div className="mt-4 bg-gray-900 text-white rounded-xl px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-lg">CELKEM K PLATBĚ</span>
                                                {(guest.deposit || 0) > 0 && (
                                                    <span className="text-xs text-gray-400 ml-2">(po odečtení zálohy)</span>
                                                )}
                                            </div>
                                            <span className="text-2xl font-black">{finalTotal.toLocaleString('cs-CZ')} Kč</span>
                                        </div>

                                        {/* Notes */}
                                        <div className="mt-4">
                                            {editingNotes === guest.id ? (
                                                <div className="flex gap-2 items-start">
                                                    <textarea
                                                        value={notesValue}
                                                        onChange={(e) => setNotesValue(e.target.value)}
                                                        placeholder="Poznámka k platbě..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                                                        rows={2}
                                                    />
                                                    <button
                                                        onClick={() => saveNotes(guest.id)}
                                                        className="bg-blue-600 text-white px-3 py-2 rounded-lg"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingNotes(null)}
                                                        className="text-gray-400 hover:text-gray-600 px-2 py-2"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingNotes(guest.id)
                                                        setNotesValue(settlement.notes || '')
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    {settlement.notes || 'Přidat poznámku'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                                            {/* Generate QR */}
                                            <button
                                                onClick={() => {
                                                    settlementAction(guest.id, 'generate_qr')
                                                    setShowQR(guest.id)
                                                }}
                                                disabled={saving || !bankSettings?.bank_iban}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <QrCode className="w-4 h-4" />
                                                {settlement.qr_generated_at ? 'Obnovit QR' : 'Generovat QR'}
                                            </button>

                                            {/* Mark as paid */}
                                            {settlement.status !== 'paid' ? (
                                                <button
                                                    onClick={() => settlementAction(guest.id, 'mark_paid')}
                                                    disabled={saving}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Označit jako zaplaceno
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => settlementAction(guest.id, 'mark_unpaid')}
                                                    disabled={saving}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    Vrátit na čeká na platbu
                                                </button>
                                            )}

                                            {/* Copy payment info */}
                                            <button
                                                onClick={() => copyPaymentInfo(guest, guestIndex)}
                                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Kopírovat info
                                            </button>
                                        </div>

                                        {/* QR Code Display */}
                                        {(showQR === guest.id || settlement.qr_generated_at) && spayd && (
                                            <div className="mt-4 flex flex-col items-center p-6 bg-white border-2 border-gray-200 rounded-xl">
                                                {/* Use official QR Platba API for guaranteed compatibility */}
                                                {getQRImageUrl(guest, guestIndex) ? (
                                                    <img
                                                        id={`qr-img-${guest.id}`}
                                                        src={getQRImageUrl(guest, guestIndex)}
                                                        alt="QR Platba"
                                                        width={250}
                                                        height={250}
                                                        className="rounded"
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <QRCodeSVG
                                                        value={spayd}
                                                        size={200}
                                                        level="M"
                                                        includeMargin
                                                    />
                                                )}
                                                <div className="mt-3 text-center">
                                                    <p className="font-bold text-gray-900 text-lg">{finalTotal.toLocaleString('cs-CZ')} Kč</p>
                                                    <p className="text-sm text-gray-500">VS: {settlement.variable_symbol || generateVS(guestIndex)}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{bankSettings?.bank_account}</p>
                                                </div>
                                                {/* Download button - for George "QR kód z galerie" */}
                                                <div className="mt-3 flex gap-2">
                                                    <a
                                                        href={getQRImageUrl(guest, guestIndex)}
                                                        download={`qr-platba-${guest.name.toLowerCase().replace(/\s+/g, '-')}.png`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        Stáhnout QR obrázek
                                                    </a>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2 text-center max-w-xs">
                                                    💡 Tip: Ulož QR do fotogalerie a v George použij &quot;QR kód z galerie&quot;
                                                </p>
                                                {settlement.qr_generated_at && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        QR vygenerováno: {new Date(settlement.qr_generated_at).toLocaleString('cs-CZ')}
                                                    </p>
                                                )}
                                                <details className="mt-2 w-full max-w-xs">
                                                    <summary className="text-xs text-gray-300 cursor-pointer hover:text-gray-400">Debug: SPAYD řetězec</summary>
                                                    <p className="text-xs text-gray-400 mt-1 font-mono break-all bg-gray-50 p-2 rounded">{spayd}</p>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {guests.length === 0 && (
                    <div className="bg-white rounded-xl shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">Žádní hosté k vyúčtování</p>
                    </div>
                )}
            </div>
        </div>
    )
}
