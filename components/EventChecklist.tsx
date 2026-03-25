'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
    UserPlus, Calendar, Armchair, MonitorSmartphone, Gamepad2,
    Check, ChevronDown, ChevronUp, BedDouble
} from 'lucide-react'
import { Session, Guest } from '@/types/database.types'

interface ChecklistStep {
    id: string
    label: string
    description: string
    icon: any
    href: string
    done: boolean
    optional?: boolean
    hidden?: boolean
}

interface EventChecklistProps {
    slug: string
    session: Session
    guest: Guest | null
    seatReserved: boolean
    hwReserved: boolean
    gamesVoted: boolean
    roomSelected?: boolean
}

export default function EventChecklist({
    slug, session, guest, seatReserved, hwReserved, gamesVoted, roomSelected,
}: EventChecklistProps) {
    const [collapsed, setCollapsed] = useState(false)

    const steps = useMemo<ChecklistStep[]>(() => {
        const hasDates = guest?.check_in_date && guest?.check_out_date

        return [
            {
                id: 'register',
                label: 'Registrace na akci',
                description: guest ? `Přihlášen/a jako ${guest.name}` : 'Vyplň jméno a vytvoř si registraci',
                icon: UserPlus,
                href: `/event/${slug}/register`,
                done: !!guest,
            },
            {
                id: 'dates',
                label: 'Příjezd a odjezd',
                description: hasDates
                    ? `${new Date(guest!.check_in_date!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })} → ${new Date(guest!.check_out_date!).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })} (${guest!.nights_count} ${guest!.nights_count === 1 ? 'noc' : guest!.nights_count! <= 4 ? 'noci' : 'nocí'})`
                    : 'Vyber si dny z kalendáře',
                icon: Calendar,
                href: `/event/${slug}/guests`,
                done: !!hasDates,
            },
            {
                id: 'seat',
                label: 'Místo k sezení',
                description: seatReserved ? 'Máš vybrané místo ✓' : 'Vyber si kde budeš sedět',
                icon: Armchair,
                href: `/event/${slug}/seats`,
                done: seatReserved,
                hidden: session.seats_enabled === false,
            },
            {
                id: 'hardware',
                label: 'Hardware',
                description: hwReserved ? 'Máš rezervovaný HW ✓' : 'Potřebuješ monitor, PC nebo jiný HW?',
                icon: MonitorSmartphone,
                href: `/event/${slug}/hardware`,
                done: hwReserved,
                optional: true,
                hidden: session.hardware_enabled === false,
            },
            {
                id: 'accommodation',
                label: 'Ubytování',
                description: roomSelected ? 'Máš vybraný pokoj ✓' : 'Vyber si kde budeš spát',
                icon: BedDouble,
                href: `/event/${slug}/accommodation`,
                done: !!roomSelected,
            },
            {
                id: 'games',
                label: 'Hry',
                description: gamesVoted ? 'Hlasoval/a jsi ✓' : 'Hlasuj co budeme hrát',
                icon: Gamepad2,
                href: `/event/${slug}/games`,
                done: gamesVoted,
                optional: true,
            },
        ].filter(s => !s.hidden)
    }, [slug, session, guest, seatReserved, hwReserved, gamesVoted, roomSelected])

    const completedCount = steps.filter(s => s.done).length
    const totalRequired = steps.filter(s => !s.optional).length
    const requiredDone = steps.filter(s => !s.optional && s.done).length
    const allRequiredDone = requiredDone >= totalRequired
    const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

    // Auto-collapse when all required steps are done
    useEffect(() => {
        if (allRequiredDone) {
            setCollapsed(true)
        }
    }, [allRequiredDone])

    if (!guest) return null // Don't show checklist until registered

    return (
        <div className="mb-4 rounded-2xl overflow-hidden" style={{
            backgroundColor: 'var(--nest-surface)',
            border: '1px solid var(--nest-border)',
        }}>
            {/* Header with progress */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-9 h-9 flex-shrink-0">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--nest-dark-4)" strokeWidth="3" />
                            <circle
                                cx="18" cy="18" r="15" fill="none"
                                stroke={allRequiredDone ? '#22c55e' : 'var(--nest-yellow)'}
                                strokeWidth="3"
                                strokeDasharray={`${progress * 0.9425} 94.25`}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{
                            color: allRequiredDone ? '#22c55e' : 'var(--nest-yellow)'
                        }}>
                            {completedCount}/{steps.length}
                        </span>
                    </div>
                    <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-[var(--nest-white)]">
                            {allRequiredDone ? 'Vše připraveno! 🎉' : 'Připrav se na event'}
                        </p>
                        <p className="text-[10px] text-[var(--nest-white-40)]">
                            {allRequiredDone
                                ? `Splněno ${completedCount} z ${steps.length} kroků`
                                : `Zbývá ${totalRequired - requiredDone} povinných kroků`
                            }
                        </p>
                    </div>
                </div>
                {collapsed ? (
                    <ChevronDown className="w-4 h-4 text-[var(--nest-white-40)] flex-shrink-0" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-[var(--nest-white-40)] flex-shrink-0" />
                )}
            </button>

            {/* Steps */}
            {!collapsed && (
                <div className="px-4 pb-3">
                    <div className="space-y-1">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon
                            return (
                                <Link
                                    key={step.id}
                                    href={step.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${step.done
                                            ? 'opacity-60 hover:opacity-80'
                                            : 'hover:bg-[var(--nest-yellow)]/5'
                                        }`}
                                >
                                    {/* Step indicator */}
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${step.done
                                            ? 'bg-green-500/20'
                                            : 'bg-[var(--nest-dark-3)] border border-[var(--nest-dark-4)]'
                                        }`}>
                                        {step.done ? (
                                            <Check className="w-3.5 h-3.5 text-green-400" />
                                        ) : (
                                            <StepIcon className="w-3.5 h-3.5 text-[var(--nest-white-40)]" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-semibold ${step.done
                                                    ? 'text-green-400 line-through'
                                                    : 'text-[var(--nest-white)]'
                                                }`}>
                                                {step.label}
                                            </span>
                                            {step.optional && !step.done && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--nest-dark-3)] text-[var(--nest-white-40)]">
                                                    volitelné
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[var(--nest-white-40)] truncate">
                                            {step.description}
                                        </p>
                                    </div>

                                    {/* Arrow for incomplete */}
                                    {!step.done && (
                                        <div className="w-5 h-5 rounded-full bg-[var(--nest-yellow)]/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[var(--nest-yellow)] text-[10px]">→</span>
                                        </div>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
