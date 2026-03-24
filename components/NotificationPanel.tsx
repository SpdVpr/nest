'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, X, UserPlus, Megaphone, UtensilsCrossed, AlertTriangle, Gamepad2, Info } from 'lucide-react'
import { useGuestAuth } from '@/lib/auth-context'

interface Notification {
    id: string
    type: string
    title: string
    body: string
    session_id: string
    is_read: boolean
    created_at: string
}

const BROADCAST_TYPE_CONFIG: Record<string, { gradient: string; icon: any; glow: string }> = {
    food: { gradient: 'from-emerald-500/90 to-emerald-700/90', icon: UtensilsCrossed, glow: 'shadow-emerald-400/20' },
    urgent: { gradient: 'from-rose-500/90 to-rose-700/90', icon: AlertTriangle, glow: 'shadow-rose-400/20' },
    fun: { gradient: 'from-amber-400/90 to-amber-600/90', icon: Gamepad2, glow: 'shadow-amber-400/20' },
    info: { gradient: 'from-sky-500/90 to-sky-700/90', icon: Info, glow: 'shadow-sky-400/20' },
}

export default function NotificationPanel() {
    const { firebaseUser, isAuthenticated } = useGuestAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    // Broadcast overlay state
    const [broadcastOverlay, setBroadcastOverlay] = useState<Notification | null>(null)
    const lastBroadcastIdRef = useRef<string>('')
    const originalTitleRef = useRef<string>('')
    const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Store original title
    useEffect(() => {
        originalTitleRef.current = document.title
        return () => stopTitleBlink()
    }, [])

    // Fetch notifications on mount and poll every 15s
    useEffect(() => {
        if (!isAuthenticated || !firebaseUser) return
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 15000)
        return () => clearInterval(interval)
    }, [isAuthenticated, firebaseUser])

    // Close panel on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [isOpen])

    const playPing = useCallback(() => {
        try {
            const ctx = new AudioContext()
            const osc1 = ctx.createOscillator()
            const gain1 = ctx.createGain()
            osc1.connect(gain1)
            gain1.connect(ctx.destination)
            osc1.frequency.value = 880
            osc1.type = 'sine'
            gain1.gain.setValueAtTime(0.4, ctx.currentTime)
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
            osc1.start(ctx.currentTime)
            osc1.stop(ctx.currentTime + 0.15)
            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.connect(gain2)
            gain2.connect(ctx.destination)
            osc2.frequency.value = 1320
            osc2.type = 'sine'
            gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15)
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
            osc2.start(ctx.currentTime + 0.15)
            osc2.stop(ctx.currentTime + 0.4)
        } catch { }
    }, [])

    const startTitleBlink = useCallback((text: string) => {
        stopTitleBlink()
        if (!originalTitleRef.current || originalTitleRef.current.startsWith('🔔')) {
            originalTitleRef.current = 'The Nest'
        }
        let show = true
        blinkIntervalRef.current = setInterval(() => {
            document.title = show ? `🔔 ${text}` : originalTitleRef.current
            show = !show
        }, 1000)
    }, [])

    const stopTitleBlink = useCallback(() => {
        if (blinkIntervalRef.current) {
            clearInterval(blinkIntervalRef.current)
            blinkIntervalRef.current = null
        }
        if (originalTitleRef.current) {
            document.title = originalTitleRef.current
        }
    }, [])

    const fetchNotifications = async () => {
        try {
            const token = await firebaseUser!.getIdToken()
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                const notifs: Notification[] = data.notifications || []
                setNotifications(notifs)
                setUnreadCount(data.unreadCount || 0)
                setLoaded(true)

                // Check for new broadcast notification — show overlay
                const latestBroadcast = notifs.find(n => n.type === 'broadcast' && !n.is_read)
                if (latestBroadcast && latestBroadcast.id !== lastBroadcastIdRef.current) {
                    lastBroadcastIdRef.current = latestBroadcast.id
                    setBroadcastOverlay(latestBroadcast)
                    playPing()
                    startTitleBlink(latestBroadcast.body || 'Nová zpráva!')
                }
            }
        } catch { }
    }

    const markAllRead = async () => {
        try {
            const token = await firebaseUser!.getIdToken()
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ mark_all_read: true }),
            })
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        } catch { }
    }

    const markRead = async (id: string) => {
        try {
            const token = await firebaseUser!.getIdToken()
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ notification_ids: [id] }),
            })
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch { }
    }

    const dismissBroadcast = () => {
        if (broadcastOverlay) {
            markRead(broadcastOverlay.id)
        }
        setBroadcastOverlay(null)
        stopTitleBlink()
    }

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'teď'
        if (mins < 60) return `${mins} min`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours} h`
        const days = Math.floor(hours / 24)
        return `${days} d`
    }

    if (!isAuthenticated || !loaded) return null

    // Determine broadcast type for styling
    const broadcastType = broadcastOverlay?.title?.includes('🍽️') ? 'food'
        : broadcastOverlay?.title?.includes('🚨') ? 'urgent'
        : broadcastOverlay?.title?.includes('🎮') ? 'fun'
        : 'info'
    const broadcastConfig = BROADCAST_TYPE_CONFIG[broadcastType] || BROADCAST_TYPE_CONFIG.info
    const BroadcastIcon = broadcastConfig.icon

    return (
        <>
            <div className="relative" ref={panelRef}>
                {/* Bell button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg hover:bg-[var(--nest-dark-3)] transition-colors relative"
                >
                    <Bell className="w-4 h-4 text-[var(--nest-white-40)]" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Panel dropdown */}
                {isOpen && (
                    <div
                        className="absolute right-0 top-full mt-2 w-80 max-h-96 rounded-xl shadow-2xl overflow-hidden z-50"
                        style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
                    >
                        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                            <span className="text-sm font-semibold" style={{ color: 'var(--nest-text-primary)' }}>
                                Oznámení
                            </span>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-[10px] px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                                        style={{ color: 'var(--nest-yellow)' }}
                                    >
                                        Přečíst vše
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="p-0.5 rounded hover:bg-white/5">
                                    <X className="w-3.5 h-3.5" style={{ color: 'var(--nest-text-tertiary)' }} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-72">
                            {notifications.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--nest-text-tertiary)' }} />
                                    <p className="text-xs" style={{ color: 'var(--nest-text-tertiary)' }}>Žádná oznámení</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.is_read && markRead(n.id)}
                                        className="px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white/[0.02] cursor-pointer"
                                        style={{
                                            borderBottom: '1px solid var(--nest-border)',
                                            backgroundColor: n.is_read ? 'transparent' : 'rgba(245, 158, 11, 0.03)',
                                        }}
                                    >
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: n.type === 'broadcast' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}>
                                            {n.type === 'broadcast' ? <Megaphone className="w-3.5 h-3.5 text-blue-400" /> : <UserPlus className="w-3.5 h-3.5 text-green-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold" style={{ color: n.is_read ? 'var(--nest-text-secondary)' : 'var(--nest-text-primary)' }}>
                                                    {n.title}
                                                </span>
                                                {!n.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--nest-yellow)] flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                {n.body}
                                            </p>
                                            <span className="text-[10px]" style={{ color: 'var(--nest-text-tertiary)' }}>
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════ BROADCAST FULLSCREEN OVERLAY ═══════ */}
            {broadcastOverlay && (
                <div
                    className="fixed inset-0 z-[100] flex items-center sm:items-start sm:pt-[15vh] justify-center px-3 sm:px-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)' }}
                    onClick={dismissBroadcast}
                >
                    <div
                        className={`w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-gradient-to-br ${broadcastConfig.gradient} rounded-xl sm:rounded-2xl shadow-2xl ${broadcastConfig.glow} overflow-hidden`}
                        style={{ animation: 'broadcastPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Shimmer bar */}
                        <div className="h-1 w-full bg-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/40" style={{ animation: 'broadcastShimmer 2s ease-in-out infinite' }} />
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                                    <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-widest">
                                        Oznámení od organizátora
                                    </span>
                                </div>
                                <button
                                    onClick={dismissBroadcast}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0" style={{ animation: 'broadcastPulse 2s ease-in-out infinite' }}>
                                    <BroadcastIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wide">
                                    {broadcastOverlay.title}
                                </span>
                            </div>

                            <p className="text-base sm:text-xl font-bold text-white leading-relaxed mb-3 sm:mb-4">
                                {broadcastOverlay.body}
                            </p>

                            <p className="text-[10px] sm:text-xs text-white/40 text-center">
                                Klikni kamkoli nebo ✕ pro zavření
                            </p>
                        </div>
                    </div>

                    <style jsx>{`
                        @keyframes broadcastPopIn {
                            0% { transform: scale(0.8) translateY(-30px); opacity: 0; }
                            100% { transform: scale(1) translateY(0); opacity: 1; }
                        }
                        @keyframes broadcastPulse {
                            0%, 100% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.1); opacity: 0.8; }
                        }
                        @keyframes broadcastShimmer {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                    `}</style>
                </div>
            )}
        </>
    )
}
