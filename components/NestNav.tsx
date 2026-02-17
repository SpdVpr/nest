'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, User, LogOut, Home } from 'lucide-react'
import { guestStorage, StoredGuest } from '@/lib/guest-storage'

interface NestNavProps {
    /** If set, shows guest avatar + name in nav */
    sessionSlug?: string
    /** Show back button pointing to this href */
    backHref?: string
    /** Title displayed in the center of the nav */
    title?: string
    /** Called when guest logs out */
    onLogout?: () => void
}

export default function NestNav({ sessionSlug, backHref, title, onLogout }: NestNavProps) {
    const [currentGuest, setCurrentGuest] = useState<StoredGuest | null>(null)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
        if (sessionSlug) {
            const guest = guestStorage.getCurrentGuest(sessionSlug)
            setCurrentGuest(guest)

            const interval = setInterval(() => {
                const g = guestStorage.getCurrentGuest(sessionSlug)
                setCurrentGuest(prev => {
                    if (g?.id !== prev?.id) return g
                    return prev
                })
            }, 1000)

            return () => clearInterval(interval)
        }
    }, [sessionSlug])

    const handleLogout = () => {
        guestStorage.clearCurrentGuest()
        setCurrentGuest(null)
        onLogout?.()
    }

    if (!mounted) return null

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--nest-dark)]/90 border-b border-[var(--nest-dark-3)]">
            <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                {/* Left: Back or Home */}
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                    {backHref ? (
                        <Link
                            href={backHref}
                            className="flex items-center gap-1.5 text-[var(--nest-white-60)] hover:text-[var(--nest-yellow)] transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Zpět</span>
                        </Link>
                    ) : (
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-[var(--nest-yellow)] font-bold text-base tracking-tight"
                        >
                            <span className="hidden sm:inline">The Nest</span>
                        </Link>
                    )}
                </div>

                {/* Center: Title */}
                {title && (
                    <h1 className="text-sm font-semibold text-[var(--nest-white)] truncate text-center flex-1 min-w-0">
                        {title}
                    </h1>
                )}

                {/* Right: Guest info or empty spacer */}
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                    {currentGuest ? (
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-[var(--nest-dark-3)] rounded-full px-3 py-1.5">
                                <div className="w-5 h-5 rounded-full bg-[var(--nest-yellow)] flex items-center justify-center">
                                    <User className="w-3 h-3 text-[var(--nest-dark)]" />
                                </div>
                                <span className="text-xs font-medium text-[var(--nest-white)] max-w-[100px] truncate">
                                    {currentGuest.name}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 rounded-lg hover:bg-[var(--nest-dark-3)] transition-colors"
                                title="Odhlásit se"
                            >
                                <LogOut className="w-3.5 h-3.5 text-[var(--nest-white-40)] hover:text-[var(--nest-error)]" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-8" /> /* spacer for centering */
                    )}
                </div>
            </div>
        </nav>
    )
}
