'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, User, Mail, Calendar, Pizza, MonitorSmartphone,
    Loader2, UserCheck, ChevronDown, Wallet, Gamepad2,
    Armchair, CreditCard, CircleDollarSign, CheckCircle2, Clock, Link2, Unlink, Trash2, Plus
} from 'lucide-react'

interface ConsumptionItem {
    name: string; category: string; qty: number; unitPrice: number; totalPrice: number
}
interface HardwareItem {
    name: string; type: string; qty: number; totalPrice: number
}
interface EventHistory {
    session: { id: string; name: string; slug: string; start_date: string; end_date: string | null; status?: string }
    guest: { id: string; name: string; nights_count: number; check_in_date?: string | null; check_out_date?: string | null; deposit: number }
    consumption: ConsumptionItem[]
    snacksTotal: number
    hardware: HardwareItem[]
    hwTotal: number
    seats: string[]
    tip: number
    gameVoteCount: number
    nightsTotal: number
    grandTotal: number
    settlement: { status: string; paid_at: string | null } | null
}
interface UserProfile {
    uid: string; email: string; display_name: string; auth_provider: string; avatar_url: string | null; created_at: string
}

export default function AdminUserDetailPage() {
    const router = useRouter()
    const params = useParams()
    const uid = params?.uid as string
    const [user, setUser] = useState<UserProfile | null>(null)
    const [events, setEvents] = useState<EventHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) { router.push('/admin/login'); return }
        fetchUserDetail()
    }, [uid])

    const getToken = () => localStorage.getItem('admin_token') || ''

    const fetchUserDetail = async () => {
        try {
            // Fetch user profile
            const usersRes = await fetch('/api/admin/registered-users', {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            })
            if (!usersRes.ok) { router.push('/admin/dashboard'); return }
            const usersData = await usersRes.json()
            const foundUser = usersData.users?.find((u: any) => u.uid === uid)
            if (!foundUser) { router.push('/admin/registered-users'); return }
            setUser(foundUser)

            // Fetch history using a server-side call
            const historyRes = await fetch(`/api/admin/registered-users/history?uid=${uid}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            })
            if (historyRes.ok) {
                const historyData = await historyRes.json()
                setEvents(historyData.events || [])
                if (historyData.events?.length > 0) {
                    setExpandedEvents(new Set([historyData.events[0].session.id]))
                }
            }
        } catch (err) {
            console.error('Failed to fetch user detail:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleEvent = (sessionId: string) => {
        setExpandedEvents(prev => {
            const next = new Set(prev)
            if (next.has(sessionId)) next.delete(sessionId); else next.add(sessionId)
            return next
        })
    }

    const fmt = (amount: number) => `${amount.toLocaleString('cs-CZ')} Kč`
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    const providerLabel = (p: string) => ({ email: 'Email', google: 'Google', apple: 'Apple' }[p] || p)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
            </div>
        )
    }

    if (!user) return null

    const totalNights = events.reduce((s, e) => s + e.guest.nights_count, 0)
    const totalSpent = events.reduce((s, e) => s + e.grandTotal, 0)
    const totalItems = events.reduce((s, e) => s + e.consumption.reduce((ss, c) => ss + c.qty, 0), 0)

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--nest-bg)' }}>
            {/* Header */}
            <div className="shadow" style={{ backgroundColor: 'var(--nest-surface)', borderBottom: '1px solid var(--nest-border)' }}>
                <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
                    <Link href="/admin/registered-users" className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--nest-text-secondary)' }}>
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-green-400" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{user.display_name}</h1>
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
                                <span>{user.email}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--nest-yellow)' }}>
                                    {providerLabel(user.auth_provider)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <Calendar className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
                        <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{events.length}</div>
                        <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Eventů</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <Clock className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
                        <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{totalNights}</div>
                        <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Nocí</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <Pizza className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
                        <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{totalItems}</div>
                        <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Položek</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <CircleDollarSign className="w-5 h-5 mb-2" style={{ color: 'var(--nest-yellow)' }} />
                        <div className="text-2xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>{fmt(totalSpent)}</div>
                        <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Celkem</div>
                    </div>
                </div>

                {/* Info */}
                <div className="flex items-center gap-4 text-xs mb-6" style={{ color: 'var(--nest-text-tertiary)' }}>
                    <span>Registrace: {fmtDate(user.created_at)}</span>
                </div>

                {/* Event history */}
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--nest-text-primary)' }}>Historie eventů</h2>

                {events.length === 0 ? (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--nest-text-tertiary)' }} />
                        <p className="text-sm" style={{ color: 'var(--nest-text-tertiary)' }}>Žádné eventy</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map(event => {
                            const isExpanded = expandedEvents.has(event.session.id)
                            const isPaid = event.settlement?.status === 'paid'
                            return (
                                <div key={event.session.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                                    <button onClick={() => toggleEvent(event.session.id)} className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-white/[0.02]">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                                <Calendar className="w-5 h-5" style={{ color: 'var(--nest-yellow)' }} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold truncate" style={{ color: 'var(--nest-text-primary)' }}>{event.session.name}</h3>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                    <span>{fmtDate(event.session.start_date)}</span>
                                                    <span>jako {event.guest.name}</span>
                                                    <span>{event.guest.nights_count} {event.guest.nights_count === 1 ? 'noc' : event.guest.nights_count < 5 ? 'noci' : 'nocí'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>{fmt(event.grandTotal)}</div>
                                                {isPaid && <span className="text-xs text-green-400">Zaplaceno</span>}
                                            </div>
                                            <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--nest-text-tertiary)' }} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--nest-border)' }}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                                {/* Accommodation */}
                                                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Wallet className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                                                        <h4 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Ubytování</h4>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span style={{ color: 'var(--nest-text-secondary)' }}>{event.guest.nights_count} {event.guest.nights_count === 1 ? 'noc' : event.guest.nights_count < 5 ? 'noci' : 'nocí'}</span>
                                                        <span className="font-medium" style={{ color: 'var(--nest-text-primary)' }}>{fmt(event.nightsTotal)}</span>
                                                    </div>
                                                    {event.guest.check_in_date && (
                                                        <div className="text-xs mt-1" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                            {new Date(event.guest.check_in_date).toLocaleDateString('cs-CZ')}
                                                            {event.guest.check_out_date && ` – ${new Date(event.guest.check_out_date).toLocaleDateString('cs-CZ')}`}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Consumption */}
                                                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Pizza className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                                                            <h4 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Občerstvení</h4>
                                                        </div>
                                                        <span className="text-xs font-bold" style={{ color: 'var(--nest-yellow)' }}>{fmt(event.snacksTotal)}</span>
                                                    </div>
                                                    {event.consumption.length > 0 ? (
                                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                                            {event.consumption.map((item, i) => (
                                                                <div key={i} className="flex justify-between text-xs">
                                                                    <span style={{ color: 'var(--nest-text-secondary)' }}>{item.qty}× {item.name}</span>
                                                                    <span className="flex-shrink-0 ml-2" style={{ color: 'var(--nest-text-tertiary)' }}>{fmt(item.totalPrice)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Žádná spotřeba</p>}
                                                </div>

                                                {/* Hardware */}
                                                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <MonitorSmartphone className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                                                            <h4 className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Hardware</h4>
                                                        </div>
                                                        {event.hwTotal > 0 && <span className="text-xs font-bold" style={{ color: 'var(--nest-yellow)' }}>{fmt(event.hwTotal)}</span>}
                                                    </div>
                                                    {event.hardware.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {event.hardware.map((item, i) => (
                                                                <div key={i} className="flex justify-between text-xs">
                                                                    <span style={{ color: 'var(--nest-text-secondary)' }}>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</span>
                                                                    {item.totalPrice > 0 && <span className="ml-2" style={{ color: 'var(--nest-text-tertiary)' }}>{fmt(item.totalPrice)}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Žádný HW</p>}
                                                </div>

                                                {/* Seats, Games, Tip */}
                                                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-3 gap-3">
                                                    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                                        <div className="flex items-center gap-1.5 mb-1"><Armchair className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} /><span className="text-xs font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Místo</span></div>
                                                        <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>{event.seats.length > 0 ? event.seats.join(', ') : '—'}</div>
                                                    </div>
                                                    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                                        <div className="flex items-center gap-1.5 mb-1"><Gamepad2 className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} /><span className="text-xs font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Hlasy</span></div>
                                                        <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>{event.gameVoteCount > 0 ? `${event.gameVoteCount} ${event.gameVoteCount === 1 ? 'hlas' : event.gameVoteCount < 5 ? 'hlasy' : 'hlasů'}` : '—'}</div>
                                                    </div>
                                                    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                                        <div className="flex items-center gap-1.5 mb-1"><CreditCard className="w-3.5 h-3.5" style={{ color: 'var(--nest-yellow)' }} /><span className="text-xs font-semibold" style={{ color: 'var(--nest-text-primary)' }}>Dýško</span></div>
                                                        <div className="text-sm font-bold" style={{ color: 'var(--nest-text-primary)' }}>{event.tip > 0 ? fmt(event.tip) : '—'}</div>
                                                    </div>
                                                </div>

                                                {/* Total */}
                                                <div className="md:col-span-2 lg:col-span-3 rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                    <div>
                                                        <span className="text-sm font-medium" style={{ color: 'var(--nest-text-secondary)' }}>Celkem za event</span>
                                                        {event.guest.deposit > 0 && <span className="text-xs block" style={{ color: 'var(--nest-text-tertiary)' }}>Záloha: {fmt(event.guest.deposit)}</span>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-lg font-bold" style={{ color: 'var(--nest-yellow)' }}>{fmt(event.grandTotal)}</span>
                                                        {isPaid && <span className="flex items-center gap-1 text-xs text-green-400 justify-end mt-0.5"><CheckCircle2 className="w-3 h-3" /> Zaplaceno</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
