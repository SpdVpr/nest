'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Receipt, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Heart, CreditCard, CheckCircle2, Download, QrCode, Copy } from 'lucide-react'
import NestPage from '@/components/NestPage'
import { guestStorage } from '@/lib/guest-storage'

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

interface SettlementInfo {
    status: string
    qr_generated_at: string
    variable_symbol: string | null
    paid_at: string | null
    finalTotal: number
}

interface BankSettings {
    bank_account: string
    bank_iban: string
    account_holder: string
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
    grandTotal: number
    settlement: SettlementInfo | null
}

export default function CostsPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [guests, setGuests] = useState<GuestCost[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedGuest, setExpandedGuest] = useState<string | null>(null)
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const [pricePerNight, setPricePerNight] = useState(0)
    const [tipEditGuest, setTipEditGuest] = useState<string | null>(null)
    const [tipAmount, setTipAmount] = useState('')
    const [tipSaving, setTipSaving] = useState(false)
    const [currentGuestId, setCurrentGuestId] = useState<string | null>(null)
    const [bankSettings, setBankSettings] = useState<BankSettings | null>(null)
    const [isPreliminary, setIsPreliminary] = useState(true)
    const [copiedVS, setCopiedVS] = useState<string | null>(null)
    const [hardwarePricingEnabled, setHardwarePricingEnabled] = useState(true)

    useEffect(() => {
        if (slug) {
            const stored = guestStorage.getCurrentGuest(slug)
            if (stored) {
                setCurrentGuestId(stored.id)
            }
        }
    }, [slug])

    const fetchCosts = async () => {
        try {
            const res = await fetch(`/api/event/${slug}/costs`)
            if (res.ok) {
                const data = await res.json()
                setGuests(data.guests)
                setPricePerNight(data.pricePerNight || 0)
                setBankSettings(data.bankSettings || null)
                setIsPreliminary(data.isPreliminary !== false)
                setHardwarePricingEnabled(data.hardwarePricingEnabled !== false)
                setLastRefresh(new Date())
            }
        } catch (error) {
            console.error('Error fetching costs:', error)
        } finally {
            setLoading(false)
        }
    }

    // Generate QR code image URL using official Czech QR Platba API
    const getQRImageUrl = (guest: GuestCost): string => {
        if (!bankSettings?.bank_account || !guest.settlement) return ''

        const amount = guest.settlement.finalTotal.toFixed(2)
        const vs = guest.settlement.variable_symbol || ''

        const rawMsg = `${guest.name}`
        const cleanMsg = rawMsg
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9 \-.,/:']/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase()
            .substring(0, 60)

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
            size: '300',
        })
        if (prefix) params.set('accountPrefix', prefix)

        return `https://api.paylibo.com/paylibo/generator/czech/image?${params.toString()}`
    }

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedVS(id)
            setTimeout(() => setCopiedVS(null), 2000)
        } catch { /* ignore */ }
    }

    useEffect(() => {
        if (slug) {
            fetchCosts()
            const interval = setInterval(fetchCosts, 30000)
            return () => clearInterval(interval)
        }
    }, [slug])

    const toggleGuest = (guestId: string) => {
        setExpandedGuest(prev => prev === guestId ? null : guestId)
    }

    const getBaseTotal = (guest: GuestCost) => {
        return guest.nightsTotal + guest.snacksTotal + guest.hwTotal
    }

    const startTipEdit = (guest: GuestCost) => {
        setTipEditGuest(guest.id)
        // Pre-fill with the current total (subtotal + existing tip)
        const base = getBaseTotal(guest)
        const currentTotal = base + guest.tip
        setTipAmount(currentTotal > 0 ? currentTotal.toString() : '')
    }

    const applyPercentage = (guest: GuestCost, pct: number) => {
        const base = getBaseTotal(guest)
        // Final amount = base + pct% of base
        const finalAmount = base + Math.round(base * pct / 100)
        setTipAmount(finalAmount.toString())
    }

    const saveTip = async (guestId: string, percentage?: number) => {
        // tipAmount is now the FINAL total - calculate tip as difference
        const finalAmount = parseInt(tipAmount) || 0
        const guest = guests.find(g => g.id === guestId)
        const base = guest ? getBaseTotal(guest) : 0
        const tipValue = Math.max(0, finalAmount - base)
        setTipSaving(true)
        try {
            const res = await fetch(`/api/event/${slug}/tips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_id: guestId,
                    amount: tipValue,
                    percentage: percentage ?? null,
                }),
            })
            if (res.ok) {
                setTipEditGuest(null)
                setTipAmount('')
                await fetchCosts()
            }
        } catch (error) {
            console.error('Error saving tip:', error)
        } finally {
            setTipSaving(false)
        }
    }

    const removeTip = async (guestId: string) => {
        setTipSaving(true)
        try {
            await fetch(`/api/event/${slug}/tips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guest_id: guestId, amount: 0 }),
            })
            setTipEditGuest(null)
            setTipAmount('')
            await fetchCosts()
        } catch (error) {
            console.error('Error removing tip:', error)
        } finally {
            setTipSaving(false)
        }
    }

    return (
        <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Přehled nákladů" maxWidth="max-w-3xl">

            {/* Header */}
            <div className="nest-card-elevated p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Receipt className="w-6 h-6 text-[var(--nest-yellow)]" />
                        <div>
                            <h1 className="text-xl font-bold">
                                Přehled nákladů
                            </h1>
                            <p className="text-xs text-[var(--nest-white-40)]">
                                Poslední aktualizace: {lastRefresh.toLocaleTimeString('cs-CZ')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchCosts()}
                        className="flex items-center gap-2 bg-[var(--nest-yellow)]/10 hover:bg-[var(--nest-yellow)]/20 text-[var(--nest-yellow)] px-3 py-1.5 rounded-xl font-medium transition-colors text-xs border border-[var(--nest-yellow)]/20"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Obnovit
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            {isPreliminary ? (
                <div className="bg-[var(--nest-warning)]/10 border border-[var(--nest-warning)]/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--nest-warning)] flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-[var(--nest-warning)] text-sm">Předběžné ceny</p>
                        <p className="text-sm text-[var(--nest-text-secondary)]">
                            Tyto ceny jsou orientační a mohou se ještě měnit. Finální vyúčtování s QR kódem k platbě vytvoří admin po skončení akce.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-900/30 border-2 border-emerald-700/50 rounded-2xl p-4 mb-6 flex items-start gap-3">
                    <CreditCard className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-emerald-400">Finální vyúčtování</p>
                        <p className="text-sm text-emerald-300/80">
                            Vyúčtování bylo dokončeno. Rozbal svou kartu pro zobrazení QR kódu k platbě.
                        </p>
                        {bankSettings && (
                            <p className="text-sm text-emerald-400 mt-1 font-medium">
                                💳 Účet: {bankSettings.bank_account}
                                {bankSettings.account_holder && ` (${bankSettings.account_holder})`}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Guest List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-[var(--nest-surface)] rounded-2xl shadow-md p-5 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--nest-border)]" />
                                <div className="flex-1">
                                    <div className="h-5 w-32 bg-[var(--nest-border)] rounded mb-2" />
                                    <div className="h-3 w-48 bg-[var(--nest-surface-alt)] rounded" />
                                </div>
                                <div className="h-6 w-20 bg-[var(--nest-border)] rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {guests.map((guest) => {
                            const isExpanded = expandedGuest === guest.id
                            const hasItems = guest.nightsTotal > 0 || guest.consumption.length > 0 || guest.hardware.length > 0 || guest.tip > 0
                            const isCurrentGuest = guest.id === currentGuestId
                            const baseTotal = getBaseTotal(guest)

                            return (
                                <div
                                    key={guest.id}
                                    className={`bg-[var(--nest-surface)] rounded-2xl shadow-md overflow-hidden transition-all ${isExpanded ? 'shadow-xl ring-2 ring-emerald-700/50' : ''
                                        } ${isCurrentGuest ? 'ring-2 ring-purple-500/50' : ''}`}
                                >
                                    {/* Summary row */}
                                    <button
                                        onClick={() => toggleGuest(guest.id)}
                                        className="w-full text-left p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--nest-surface-alt)] transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                                {guest.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-[var(--nest-text-primary)] text-lg">{guest.name}</h3>
                                                    {isCurrentGuest && (
                                                        <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full font-medium">ty</span>
                                                    )}
                                                    {guest.settlement?.status === 'paid' && (
                                                        <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full font-medium">✅ zaplaceno</span>
                                                    )}
                                                    {guest.settlement && guest.settlement.status !== 'paid' && (
                                                        <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded-full font-medium">💳 k zaplacení</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-[var(--nest-text-secondary)] flex-wrap">
                                                    {guest.nightsTotal > 0 && (
                                                        <span>🏠 {guest.nightsTotal.toLocaleString('cs-CZ')} Kč</span>
                                                    )}
                                                    {guest.consumption.length > 0 && (
                                                        <span>🍕 {guest.snacksTotal.toLocaleString('cs-CZ')} Kč</span>
                                                    )}
                                                    {guest.hwTotal > 0 && hardwarePricingEnabled && (
                                                        <span>💻 {guest.hwTotal.toLocaleString('cs-CZ')} Kč</span>
                                                    )}
                                                    {guest.tip > 0 && (
                                                        <span>💖 {guest.tip.toLocaleString('cs-CZ')} Kč</span>
                                                    )}
                                                    {!hasItems && (
                                                        <span className="text-[var(--nest-text-tertiary)]">Zatím žádné náklady</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className={`text-xl font-bold ${(guest.settlement ? guest.settlement.finalTotal : guest.grandTotal) > 0 ? 'text-emerald-400' : 'text-[var(--nest-text-tertiary)]'}`}>
                                                {(guest.settlement ? guest.settlement.finalTotal : guest.grandTotal).toLocaleString('cs-CZ')} Kč
                                            </span>
                                            {isExpanded
                                                ? <ChevronUp className="w-5 h-5 text-[var(--nest-text-tertiary)]" />
                                                : <ChevronDown className="w-5 h-5 text-[var(--nest-text-tertiary)]" />
                                            }
                                        </div>
                                    </button>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 border-t border-[var(--nest-border)]">
                                            {/* Accommodation */}
                                            {guest.nightsTotal > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-semibold text-[var(--nest-text-secondary)] uppercase tracking-wider mb-2">
                                                        🏠 Ubytování — {guest.nightsTotal.toLocaleString('cs-CZ')} Kč
                                                    </h4>
                                                    <div className="flex items-center justify-between py-1.5 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[var(--nest-text-tertiary)] text-xs w-8">{guest.nights_count}×</span>
                                                            <span className="text-[var(--nest-text-primary)]">Noc</span>
                                                            <span className="text-[var(--nest-text-tertiary)] text-xs">({pricePerNight} Kč/noc)</span>
                                                        </div>
                                                        <span className="font-semibold text-[var(--nest-text-primary)]">
                                                            {guest.nightsTotal.toLocaleString('cs-CZ')} Kč
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Consumption */}
                                            {guest.consumption.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-semibold text-[var(--nest-text-secondary)] uppercase tracking-wider mb-2">
                                                        🍕 Občerstvení — {guest.snacksTotal.toLocaleString('cs-CZ')} Kč
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {guest.consumption.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-[var(--nest-text-tertiary)] text-xs w-8">{item.qty}×</span>
                                                                    <span className="text-[var(--nest-text-primary)]">{item.name}</span>
                                                                    <span className="text-[var(--nest-text-tertiary)] text-xs">({item.unitPrice} Kč/ks)</span>
                                                                </div>
                                                                <span className="font-semibold text-[var(--nest-text-primary)] flex-shrink-0 ml-2">
                                                                    {item.totalPrice.toLocaleString('cs-CZ')} Kč
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hardware */}
                                            {guest.hardware.length > 0 && hardwarePricingEnabled && (
                                                <div className={guest.consumption.length > 0 ? 'mt-4 pt-4 border-t border-[var(--nest-border)]' : 'mt-4'}>
                                                    <h4 className="text-sm font-semibold text-[var(--nest-text-secondary)] uppercase tracking-wider mb-2">
                                                        💻 Hardware — {guest.hwTotal.toLocaleString('cs-CZ')} Kč
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {guest.hardware.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-[var(--nest-text-tertiary)] text-xs w-8">{item.qty}×</span>
                                                                    <span className="text-[var(--nest-text-primary)]">{item.name}</span>
                                                                </div>
                                                                <span className="font-semibold text-[var(--nest-text-primary)] flex-shrink-0 ml-2">
                                                                    {item.totalPrice > 0 ? `${item.totalPrice.toLocaleString('cs-CZ')} Kč` : 'Zdarma'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tip Section - Final Amount Mode */}
                                            <div className={`mt-4 pt-4 border-t border-[var(--nest-border)]`}>
                                                {tipEditGuest === guest.id ? (
                                                    /* Tip editing mode - now using final total */
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-pink-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                            <Heart className="w-4 h-4" />
                                                            Dýško
                                                        </h4>
                                                        <p className="text-xs text-[var(--nest-text-tertiary)] mb-3">
                                                            Na kolik chceš zaokrouhlit? (bez dýška: {baseTotal.toLocaleString('cs-CZ')} Kč)
                                                        </p>

                                                        {/* Quick percentage buttons - now show final total */}
                                                        <div className="flex gap-2 mb-3">
                                                            {[5, 10, 15].map(pct => {
                                                                const tipCalc = Math.round(baseTotal * pct / 100)
                                                                const finalCalc = baseTotal + tipCalc
                                                                return (
                                                                    <button
                                                                        key={pct}
                                                                        onClick={() => applyPercentage(guest, pct)}
                                                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${tipAmount === finalCalc.toString()
                                                                            ? 'bg-pink-500 text-white border-pink-500 shadow-md'
                                                                            : 'bg-pink-900/30 text-pink-300 border-pink-700/50 hover:bg-pink-900/50'
                                                                            }`}
                                                                    >
                                                                        <div className="text-lg">{finalCalc.toLocaleString('cs-CZ')} Kč</div>
                                                                        <div className="text-xs opacity-75">+{pct}% ({tipCalc} Kč)</div>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>

                                                        {/* Quick round buttons */}
                                                        <div className="flex gap-1.5 mb-3">
                                                            {[50, 100, 500, 1000].map(step => {
                                                                const roundedUp = Math.ceil(baseTotal / step) * step
                                                                if (roundedUp <= baseTotal) return null
                                                                return (
                                                                    <button
                                                                        key={step}
                                                                        onClick={() => setTipAmount(roundedUp.toString())}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${tipAmount === roundedUp.toString()
                                                                            ? 'bg-pink-500 text-white border-pink-500'
                                                                            : 'bg-pink-900/20 text-pink-300 border-pink-700/40 hover:bg-pink-900/40'
                                                                            }`}
                                                                    >
                                                                        {roundedUp.toLocaleString('cs-CZ')} Kč
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>

                                                        {/* Custom final amount */}
                                                        <div className="flex gap-2 items-center">
                                                            <div className="relative flex-1">
                                                                <input
                                                                    type="number"
                                                                    value={tipAmount}
                                                                    onChange={(e) => setTipAmount(e.target.value)}
                                                                    placeholder={`např. ${Math.ceil(baseTotal / 100) * 100}`}
                                                                    className="w-full pl-4 pr-12 py-2.5 border-2 border-[var(--nest-border)] rounded-xl focus:border-pink-400 focus:ring-2 focus:ring-pink-900/30 outline-none text-[var(--nest-text-primary)] bg-[var(--nest-bg)] font-medium text-right"
                                                                    min={baseTotal}
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--nest-text-tertiary)] font-medium">Kč</span>
                                                            </div>
                                                            <button
                                                                onClick={() => saveTip(guest.id)}
                                                                disabled={tipSaving}
                                                                className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                                                            >
                                                                {tipSaving ? '...' : 'Uložit'}
                                                            </button>
                                                            <button
                                                                onClick={() => { setTipEditGuest(null); setTipAmount('') }}
                                                                className="px-3 py-2.5 bg-[var(--nest-surface-alt)] hover:bg-[var(--nest-border)] text-[var(--nest-text-secondary)] rounded-xl transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>

                                                        {/* Show calculated tip */}
                                                        {tipAmount && parseInt(tipAmount) > baseTotal && (
                                                            <p className="text-xs text-pink-400 mt-1.5">
                                                                → Dýško: {(parseInt(tipAmount) - baseTotal).toLocaleString('cs-CZ')} Kč
                                                            </p>
                                                        )}

                                                        {/* Remove tip */}
                                                        {guest.tip > 0 && (
                                                            <button
                                                                onClick={() => removeTip(guest.id)}
                                                                className="mt-2 text-xs text-[var(--nest-text-tertiary)] hover:text-red-400 transition-colors"
                                                            >
                                                                Odebrat dýško
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Tip display / add button */
                                                    <div className="flex items-center justify-between">
                                                        {guest.tip > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                                                                <span className="text-sm text-pink-400 font-medium">
                                                                    Dýško{guest.tipPercentage ? ` (${guest.tipPercentage}%)` : ''}
                                                                </span>
                                                                <span className="font-semibold text-pink-400">{guest.tip.toLocaleString('cs-CZ')} Kč</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-[var(--nest-text-tertiary)]">Žádné dýško</span>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startTipEdit(guest) }}
                                                            className="text-sm text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 hover:bg-pink-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            <Heart className="w-3.5 h-3.5" />
                                                            {guest.tip > 0 ? 'Upravit' : 'Přidat dýško'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Guest total */}
                                            <div className="mt-4 pt-3 border-t-2 border-emerald-800/50 flex items-center justify-between">
                                                <span className="font-semibold text-[var(--nest-text-primary)]">Celkem za {guest.name}</span>
                                                <span className="text-xl font-bold text-emerald-400">
                                                    {(guest.settlement ? guest.settlement.finalTotal : guest.grandTotal).toLocaleString('cs-CZ')} Kč
                                                </span>
                                            </div>

                                            {/* Payment QR Section */}
                                            {guest.settlement && (
                                                <div className="mt-4">
                                                    {guest.settlement.status === 'paid' ? (
                                                        /* Already paid */
                                                        <div className="bg-emerald-900/30 border-2 border-emerald-700/50 rounded-xl p-4 flex items-center gap-3">
                                                            <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-bold text-emerald-400 text-lg">Zaplaceno ✅</p>
                                                                {guest.settlement.paid_at && (
                                                                    <p className="text-sm text-emerald-400/80">
                                                                        {new Date(guest.settlement.paid_at).toLocaleString('cs-CZ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* Payment QR card */
                                                        <div className="bg-blue-900/20 border-2 border-blue-700/50 rounded-xl p-5">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <QrCode className="w-5 h-5 text-blue-600" />
                                                                <h4 className="font-bold text-blue-400 text-lg">Platba</h4>
                                                            </div>

                                                            {/* QR Code */}
                                                            <div className="flex flex-col items-center">
                                                                {getQRImageUrl(guest) && (
                                                                    <div className="bg-white p-3 rounded-xl mb-4">
                                                                        <img
                                                                            src={getQRImageUrl(guest)}
                                                                            alt="QR Platba"
                                                                            width={250}
                                                                            height={250}
                                                                            className="rounded"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Amount */}
                                                                <p className="text-3xl font-black text-[var(--nest-text-primary)] mb-3">
                                                                    {guest.settlement.finalTotal.toLocaleString('cs-CZ')} Kč
                                                                </p>

                                                                {/* Payment details */}
                                                                <div className="w-full bg-[var(--nest-bg)] rounded-lg p-3 space-y-2">
                                                                    {bankSettings && (
                                                                        <div className="flex items-center justify-between text-sm">
                                                                            <span className="text-[var(--nest-text-secondary)]">Číslo účtu:</span>
                                                                            <span className="font-semibold text-[var(--nest-text-primary)] font-mono">{bankSettings.bank_account}</span>
                                                                        </div>
                                                                    )}
                                                                    {guest.settlement.variable_symbol && (
                                                                        <div className="flex items-center justify-between text-sm">
                                                                            <span className="text-[var(--nest-text-secondary)]">VS:</span>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="font-semibold text-[var(--nest-text-primary)] font-mono">{guest.settlement.variable_symbol}</span>
                                                                                <button
                                                                                    onClick={() => copyToClipboard(guest.settlement!.variable_symbol!, guest.id)}
                                                                                    className="text-[var(--nest-text-tertiary)] hover:text-blue-400 transition-colors p-0.5"
                                                                                    title="Kopírovat VS"
                                                                                >
                                                                                    {copiedVS === guest.id ? (
                                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                                    ) : (
                                                                                        <Copy className="w-3.5 h-3.5" />
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {bankSettings?.account_holder && (
                                                                        <div className="flex items-center justify-between text-sm">
                                                                            <span className="text-[var(--nest-text-secondary)]">Majitel účtu:</span>
                                                                            <span className="font-medium text-[var(--nest-text-primary)]">{bankSettings.account_holder}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Download QR */}
                                                                {getQRImageUrl(guest) && (
                                                                    <div className="mt-3 flex flex-col items-center gap-2">
                                                                        <a
                                                                            href={getQRImageUrl(guest)}
                                                                            download={`qr-platba-${guest.name.toLowerCase().replace(/\s+/g, '-')}.png`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                                                        >
                                                                            <Download className="w-4 h-4" />
                                                                            Stáhnout QR obrázek
                                                                        </a>
                                                                        <p className="text-xs text-[var(--nest-text-tertiary)] text-center">
                                                                            💡 Tip: Ulož QR do fotogalerie a v George použij &quot;QR kód z galerie&quot;
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {guests.length === 0 && (
                        <div className="bg-[var(--nest-surface)] rounded-2xl shadow-xl p-12 text-center">
                            <p className="text-[var(--nest-text-secondary)] text-lg">Zatím nejsou žádní hosté</p>
                        </div>
                    )}
                </>
            )}

            {/* Footer disclaimer */}
            <div className="mt-8 text-center">
                <p className="text-xs text-[var(--nest-text-tertiary)]">
                    {isPreliminary
                        ? 'Ceny se automaticky aktualizují každých 30 sekund • Data jsou předběžná'
                        : 'Ceny se automaticky aktualizují každých 30 sekund • Finální vyúčtování'
                    }
                </p>
            </div>
        </NestPage>
    )
}
