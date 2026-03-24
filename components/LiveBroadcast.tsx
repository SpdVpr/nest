'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Megaphone, UtensilsCrossed, AlertTriangle, Gamepad2, Info } from 'lucide-react'

interface Broadcast {
    id: string
    type: 'info' | 'food' | 'urgent' | 'fun'
    title: string
    body: string
    created_by: string
    created_at: string
}

const TYPE_CONFIG = {
    info: {
        gradient: 'from-sky-500/90 to-sky-700/90',
        glow: 'shadow-sky-400/20',
        icon: Info,
        emoji: 'ℹ️',
    },
    food: {
        gradient: 'from-emerald-500/90 to-emerald-700/90',
        glow: 'shadow-emerald-400/20',
        icon: UtensilsCrossed,
        emoji: '🍽️',
    },
    urgent: {
        gradient: 'from-rose-500/90 to-rose-700/90',
        glow: 'shadow-rose-400/20',
        icon: AlertTriangle,
        emoji: '🚨',
    },
    fun: {
        gradient: 'from-amber-400/90 to-amber-600/90',
        glow: 'shadow-amber-400/20',
        icon: Gamepad2,
        emoji: '🎮',
    },
}

export default function LiveBroadcast({ sessionId, slug }: { sessionId?: string; slug?: string }) {
    const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())
    const [isAnimating, setIsAnimating] = useState(false)
    const lastSeenRef = useRef<string>('')
    const originalTitleRef = useRef<string>('')
    const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Store original title
    useEffect(() => {
        originalTitleRef.current = document.title
        return () => stopTitleBlink()
    }, [])

    const playPing = useCallback(() => {
        try {
            const ctx = new AudioContext()
            // First tone
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
            // Second tone (higher)
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

    const startTitleBlink = useCallback((title: string) => {
        stopTitleBlink()
        if (!originalTitleRef.current || originalTitleRef.current.startsWith('🔔')) {
            originalTitleRef.current = 'The Nest'
        }
        let show = true
        blinkIntervalRef.current = setInterval(() => {
            document.title = show ? `🔔 ${title}` : originalTitleRef.current
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

    // Poll for broadcasts every 5 seconds
    useEffect(() => {
        if (!sessionId && !slug) return

        const poll = async () => {
            try {
                const params = new URLSearchParams()
                if (sessionId) params.set('session_id', sessionId)
                else if (slug) params.set('slug', slug)
                if (lastSeenRef.current) {
                    params.set('after', lastSeenRef.current)
                }
                const res = await fetch(`/api/broadcast?${params}`)
                if (!res.ok) return
                const data = await res.json()

                if (data.broadcast && !dismissed.has(data.broadcast.id)) {
                    const isNew = data.broadcast.id !== broadcast?.id
                    setBroadcast(data.broadcast)
                    lastSeenRef.current = data.broadcast.created_at

                    if (isNew) {
                        setIsAnimating(true)
                        playPing()
                        // Always blink title — even when tab is focused
                        startTitleBlink(data.broadcast.body || 'Nová zpráva!')
                    }
                }
            } catch { }
        }

        poll()
        const interval = setInterval(poll, 5000)
        return () => clearInterval(interval)
    }, [sessionId, slug, dismissed, broadcast?.id, playPing, startTitleBlink])

    const handleDismiss = () => {
        if (broadcast) {
            setDismissed(prev => new Set(prev).add(broadcast.id))
            setBroadcast(null)
            setIsAnimating(false)
            stopTitleBlink()
        }
    }

    if (!broadcast || dismissed.has(broadcast.id)) return null

    const config = TYPE_CONFIG[broadcast.type] || TYPE_CONFIG.info
    const Icon = config.icon

    return (
        <>
            {/* Full-screen overlay backdrop */}
            <div
                className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
                onClick={handleDismiss}
            >
                {/* Broadcast card */}
                <div
                    className={`w-full max-w-lg bg-gradient-to-br ${config.gradient} rounded-2xl shadow-2xl ${config.glow} overflow-hidden`}
                    style={{ animation: 'broadcastPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Animated top bar */}
                    <div className="h-1 w-full bg-white/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/40" style={{ animation: 'broadcastShimmer 2s ease-in-out infinite' }} />
                    </div>

                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-white/60" />
                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                                    Oznámení od organizátora
                                </span>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-white/80" />
                            </button>
                        </div>

                        {/* Icon + Type */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center" style={{ animation: 'broadcastPulse 2s ease-in-out infinite' }}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-sm font-bold text-white/80 uppercase tracking-wide">
                                {broadcast.title}
                            </span>
                        </div>

                        {/* Message body */}
                        <p className="text-xl font-bold text-white leading-relaxed mb-4">
                            {broadcast.body}
                        </p>

                        {/* Dismiss hint */}
                        <p className="text-xs text-white/40 text-center">
                            Klikni kamkoli nebo ✕ pro zavření
                        </p>
                    </div>
                </div>
            </div>

            {/* Also show a sticky top banner that persists after overlay dismiss — wait, user wants it gone on dismiss */}

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
        </>
    )
}
