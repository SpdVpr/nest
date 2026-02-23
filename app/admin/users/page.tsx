'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Shield, ShieldCheck, HardHat, Check, X, Trash2, ChevronDown } from 'lucide-react'
import { AdminUser, AdminRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/admin-roles'

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('admin_token')
        if (!token) {
            router.push('/admin/login')
            return
        }
        fetchUsers()
    }, [router])

    const getToken = () => localStorage.getItem('admin_token') || ''

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            })
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users || [])
            } else if (res.status === 403) {
                alert('Nemáš oprávnění pro správu uživatelů.')
                router.push('/admin/dashboard')
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (uid: string) => {
        setUpdating(uid)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ uid, approved: true }),
            })
            if (res.ok) {
                fetchUsers()
            }
        } catch (error) {
            console.error('Failed to approve user:', error)
        } finally {
            setUpdating(null)
        }
    }

    const handleReject = async (uid: string) => {
        if (!confirm('Opravdu chceš tento účet zamítnout a smazat?')) return
        setUpdating(uid)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ uid }),
            })
            if (res.ok) {
                fetchUsers()
            }
        } catch (error) {
            console.error('Failed to delete user:', error)
        } finally {
            setUpdating(null)
        }
    }

    const handleRoleChange = async (uid: string, role: AdminRole) => {
        setUpdating(uid)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ uid, role }),
            })
            if (res.ok) {
                fetchUsers()
            }
        } catch (error) {
            console.error('Failed to update role:', error)
        } finally {
            setUpdating(null)
        }
    }

    const getRoleIcon = (role: AdminRole) => {
        switch (role) {
            case 'admin': return <Shield className="w-4 h-4" />
            case 'master_brigadnik': return <ShieldCheck className="w-4 h-4" />
            case 'brigadnik': return <HardHat className="w-4 h-4" />
        }
    }

    const getRoleColor = (role: AdminRole) => {
        switch (role) {
            case 'admin': return '#ef4444'
            case 'master_brigadnik': return '#f59e0b'
            case 'brigadnik': return '#22c55e'
        }
    }

    const pendingUsers = users.filter(u => !u.approved)
    const approvedUsers = users.filter(u => u.approved)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--nest-bg)' }}>
                <div className="text-center">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--nest-border)', borderTopColor: 'var(--nest-yellow)' }}></div>
                    <p style={{ color: 'var(--nest-text-secondary)' }}>Načítám uživatele...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--nest-bg)' }}>
            {/* Header */}
            <div className="shadow" style={{ backgroundColor: 'var(--nest-surface)', borderBottom: '1px solid var(--nest-border)' }}>
                <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--nest-text-secondary)' }}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <Users className="w-6 h-6" style={{ color: 'var(--nest-yellow)' }} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold" style={{ color: 'var(--nest-text-primary)' }}>Správa uživatelů</h1>
                                <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>{users.length} registrovaných</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Pending Approvals */}
                {pendingUsers.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--nest-yellow)' }}>
                            ⏳ Čeká na schválení ({pendingUsers.length})
                        </h2>
                        <div className="space-y-3">
                            {pendingUsers.map(user => (
                                <div
                                    key={user.uid}
                                    className="rounded-xl p-5"
                                    style={{
                                        backgroundColor: 'var(--nest-surface)',
                                        border: '2px solid rgba(245, 158, 11, 0.3)',
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-lg" style={{ color: 'var(--nest-text-primary)' }}>{user.name}</p>
                                            <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>{user.email}</p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                Registrace: {new Date(user.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(user.uid)}
                                                disabled={updating === user.uid}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                                                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                                            >
                                                <Check className="w-4 h-4" />
                                                Schválit
                                            </button>
                                            <button
                                                onClick={() => handleReject(user.uid)}
                                                disabled={updating === user.uid}
                                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                            >
                                                <X className="w-4 h-4" />
                                                Zamítnout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Role Legend */}
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                    <h3 className="font-bold mb-3" style={{ color: 'var(--nest-text-primary)' }}>Role přístupu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(['admin', 'master_brigadnik', 'brigadnik'] as AdminRole[]).map(role => (
                            <div key={role} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--nest-bg)' }}>
                                <div className="mt-0.5" style={{ color: getRoleColor(role) }}>
                                    {getRoleIcon(role)}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: getRoleColor(role) }}>{ROLE_LABELS[role]}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--nest-text-tertiary)' }}>{ROLE_DESCRIPTIONS[role]}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Approved Users */}
                <div>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--nest-text-primary)' }}>
                        Schválení uživatelé ({approvedUsers.length})
                    </h2>
                    {approvedUsers.length === 0 ? (
                        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                            <p style={{ color: 'var(--nest-text-tertiary)' }}>Zatím žádní schválení uživatelé</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {approvedUsers.map(user => (
                                <div
                                    key={user.uid}
                                    className="rounded-xl p-5 transition-colors"
                                    style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getRoleColor(user.role)}15`, color: getRoleColor(user.role) }}>
                                                {getRoleIcon(user.role)}
                                            </div>
                                            <div>
                                                <p className="font-bold" style={{ color: 'var(--nest-text-primary)' }}>{user.name}</p>
                                                <p className="text-sm" style={{ color: 'var(--nest-text-secondary)' }}>{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Role selector */}
                                            <div className="relative">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.uid, e.target.value as AdminRole)}
                                                    disabled={updating === user.uid}
                                                    className="appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-medium cursor-pointer"
                                                    style={{
                                                        backgroundColor: `${getRoleColor(user.role)}15`,
                                                        color: getRoleColor(user.role),
                                                        border: `1px solid ${getRoleColor(user.role)}40`,
                                                    }}
                                                >
                                                    <option value="brigadnik">Brigádník</option>
                                                    <option value="master_brigadnik">Master Brigádník</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: getRoleColor(user.role) }} />
                                            </div>

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleReject(user.uid)}
                                                disabled={updating === user.uid}
                                                className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                                                style={{ color: 'var(--nest-text-tertiary)' }}
                                                title="Smazat uživatele"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
