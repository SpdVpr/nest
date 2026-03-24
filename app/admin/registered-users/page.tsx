'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, UserCheck, Mail, Calendar, Trash2, Link2, Unlink,
    ChevronDown, ChevronRight, Search, Plus, X, Loader2, Users, ExternalLink
} from 'lucide-react'

interface ClaimedGuest {
    id: string
    name: string
    session_id: string
    session_name: string
    session_slug: string
    nights_count: number
}

interface RegisteredUser {
    uid: string
    email: string
    display_name: string
    auth_provider: string
    avatar_url: string | null
    created_at: string
    guests: ClaimedGuest[]
}

interface SessionInfo {
    id: string
    name: string
    slug: string
    start_date: string
}

interface UnclaimedGuest {
    id: string
    name: string
    session_id: string
    session_name: string
}

export default function RegisteredUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<RegisteredUser[]>([])
    const [sessions, setSessions] = useState<SessionInfo[]>([])
    const [unclaimedGuests, setUnclaimedGuests] = useState<UnclaimedGuest[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // Assign modal state
    const [assignModal, setAssignModal] = useState<{ userId: string; userName: string } | null>(null)
    const [assignSessionFilter, setAssignSessionFilter] = useState('')
    const [assignGuestSearch, setAssignGuestSearch] = useState('')

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
            return
        }
        fetchData()
    }, [router])

    const getToken = () => localStorage.getItem('admin_token') || ''

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/registered-users', {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            })
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users || [])
                setSessions(data.sessions || [])
                setUnclaimedGuests(data.unclaimedGuests || [])
            } else if (res.status === 401 || res.status === 403) {
                router.push('/admin/dashboard')
            }
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAssign = async (guestId: string) => {
        if (!assignModal) return
        setUpdating(true)
        try {
            const res = await fetch('/api/admin/registered-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ action: 'assign', user_id: assignModal.userId, guest_id: guestId }),
            })
            if (res.ok) {
                setAssignModal(null)
                await fetchData()
            } else {
                const data = await res.json()
                alert(data.error || 'Přiřazení selhalo')
            }
        } catch {
            alert('Chyba při přiřazování')
        } finally {
            setUpdating(false)
        }
    }

    const handleUnassign = async (guestId: string) => {
        if (!confirm('Opravdu chceš odpárovat tohoto hosta od uživatele?')) return
        setUpdating(true)
        try {
            await fetch('/api/admin/registered-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ action: 'unassign', guest_id: guestId }),
            })
            await fetchData()
        } catch {
            alert('Chyba při odpárování')
        } finally {
            setUpdating(false)
        }
    }

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Opravdu chceš smazat uživatele "${userName}"? Všichni jeho spárovaní hosté budou odpárováni.`)) return
        setUpdating(true)
        try {
            await fetch('/api/admin/registered-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ action: 'delete_user', user_id: userId }),
            })
            await fetchData()
        } catch {
            alert('Chyba při mazání')
        } finally {
            setUpdating(false)
        }
    }

    const toggleUser = (uid: string) => {
        setExpandedUsers(prev => {
            const next = new Set(prev)
            if (next.has(uid)) next.delete(uid)
            else next.add(uid)
            return next
        })
    }

    const providerLabel = (p: string) => ({ email: 'Email', google: 'Google', apple: 'Apple' }[p] || p)
    const providerColor = (p: string) => ({ email: '#8b5cf6', google: '#4285F4', apple: '#fff' }[p] || '#888')

    const filteredUsers = users.filter(u =>
        u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Filtered unclaimed guests for assign modal
    const filteredUnclaimedGuests = unclaimedGuests.filter(g => {
        if (assignSessionFilter && g.session_id !== assignSessionFilter) return false
        if (assignGuestSearch && !g.name.toLowerCase().includes(assignGuestSearch.toLowerCase())) return false
        return true
    })

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg)' }}>
                <div className="text-center">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--nest-border)', borderTopColor: 'var(--nest-yellow)' }} />
                    <p style={{ color: 'var(--nest-text-secondary)' }}>Načítám uživatele...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--nest-bg)' }}>
            {/* Header */}
            <div className="shadow" style={{ backgroundColor: 'var(--nest-surface)', borderBottom: '1px solid var(--nest-border)' }}>
                <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--nest-text-secondary)' }}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                <UserCheck className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>Správa uživatelů</h1>
                                <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>{users.length} uživatelů</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--nest-text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Hledat uživatele..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                        style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                    />
                </div>

                {/* Users list */}
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <UserCheck className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--nest-text-tertiary)' }} />
                        <p style={{ color: 'var(--nest-text-tertiary)' }}>
                            {searchQuery ? 'Žádní uživatelé nenalezeni' : 'Zatím žádní registrovaní uživatelé'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredUsers.map(user => {
                            const isExpanded = expandedUsers.has(user.uid)
                            return (
                                <div
                                    key={user.uid}
                                    className="rounded-xl overflow-hidden"
                                    style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
                                >
                                    {/* User row */}
                                    <button
                                        onClick={() => toggleUser(user.uid)}
                                        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <UserCheck className="w-5 h-5 text-green-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--nest-text-primary)' }}>
                                                        {user.display_name}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0" style={{ backgroundColor: `${providerColor(user.auth_provider)}15`, color: providerColor(user.auth_provider) }}>
                                                        {providerLabel(user.auth_provider)}
                                                    </span>
                                                </div>
                                                <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                    {user.email}
                                                </div>
                                                {user.guests.length > 0 ? (
                                                    <div className="flex items-center gap-1 mt-0.5 text-xs text-green-400">
                                                        <Link2 className="w-3 h-3" />
                                                        <span>Spárováno: {user.guests.map(g => g.name).join(', ')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                        <Unlink className="w-3 h-3" />
                                                        <span>Nespárováno</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--nest-bg)', color: 'var(--nest-text-secondary)' }}>
                                                {user.guests.length} {user.guests.length === 1 ? 'event' : 'eventů'}
                                            </span>
                                            <Link
                                                href={`/admin/registered-users/${user.uid}`}
                                                target="_blank"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--nest-yellow)]/10"
                                                title="Detail uživatele"
                                            >
                                                <ExternalLink className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                                            </Link>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--nest-text-tertiary)' }} />
                                        </div>
                                    </button>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--nest-border)' }}>
                                            <div className="pt-4 space-y-4">
                                                {/* Info row */}
                                                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        Registrace: {new Date(user.created_at).toLocaleDateString('cs-CZ')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </span>
                                                </div>

                                                {/* Claimed guests */}
                                                <div>
                                                    <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--nest-text-secondary)' }}>
                                                        Spárované eventy ({user.guests.length})
                                                    </h4>
                                                    {user.guests.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {user.guests.map(guest => (
                                                                <div
                                                                    key={guest.id}
                                                                    className="flex items-center justify-between p-3 rounded-lg"
                                                                    style={{ backgroundColor: 'var(--nest-bg)' }}
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-medium" style={{ color: 'var(--nest-text-primary)' }}>
                                                                            {guest.name}
                                                                        </div>
                                                                        <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                                            {guest.session_name} · {guest.nights_count} {guest.nights_count === 1 ? 'noc' : guest.nights_count < 5 ? 'noci' : 'nocí'}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleUnassign(guest.id)}
                                                                        disabled={updating}
                                                                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 flex-shrink-0"
                                                                        title="Odpárovat"
                                                                    >
                                                                        <Unlink className="w-3.5 h-3.5 text-red-400" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Žádné spárované eventy</p>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            setAssignModal({ userId: user.uid, userName: user.display_name })
                                                            setAssignSessionFilter('')
                                                            setAssignGuestSearch('')
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Přiřadit k eventu
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.uid, user.display_name)}
                                                        disabled={updating}
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Smazat uživatele
                                                    </button>
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

            {/* Assign Modal */}
            {assignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setAssignModal(null)}>
                    <div
                        className="rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
                        style={{ backgroundColor: 'var(--nest-surface)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="p-5" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--nest-text-primary)' }}>
                                    Přiřadit k eventu
                                </h2>
                                <button onClick={() => setAssignModal(null)} className="p-1 rounded-lg hover:bg-white/5">
                                    <X className="w-5 h-5" style={{ color: 'var(--nest-text-tertiary)' }} />
                                </button>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>
                                Vyber nespárované jméno pro <strong>{assignModal.userName}</strong>
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                            <select
                                value={assignSessionFilter}
                                onChange={(e) => setAssignSessionFilter(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                            >
                                <option value="">Všechny eventy</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--nest-text-tertiary)' }} />
                                <input
                                    type="text"
                                    placeholder="Hledat jméno..."
                                    value={assignGuestSearch}
                                    onChange={(e) => setAssignGuestSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                                    style={{ backgroundColor: 'var(--nest-bg)', border: '1px solid var(--nest-border)', color: 'var(--nest-text-primary)' }}
                                />
                            </div>
                        </div>

                        {/* Guest list */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {filteredUnclaimedGuests.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--nest-text-tertiary)' }} />
                                    <p className="text-sm" style={{ color: 'var(--nest-text-tertiary)' }}>
                                        Žádní nespárovaní hosté
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredUnclaimedGuests.map(guest => (
                                        <button
                                            key={guest.id}
                                            onClick={() => handleAssign(guest.id)}
                                            disabled={updating}
                                            className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors hover:bg-[var(--nest-yellow)]/5 disabled:opacity-50"
                                            style={{ border: '1px solid var(--nest-border)' }}
                                        >
                                            <div>
                                                <div className="text-sm font-medium" style={{ color: 'var(--nest-text-primary)' }}>
                                                    {guest.name}
                                                </div>
                                                <div className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                    {guest.session_name}
                                                </div>
                                            </div>
                                            {updating ? (
                                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--nest-yellow)' }} />
                                            ) : (
                                                <Link2 className="w-4 h-4" style={{ color: 'var(--nest-yellow)' }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
