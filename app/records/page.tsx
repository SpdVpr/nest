'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, ArrowLeft } from 'lucide-react'
import NestLoading from '@/components/NestLoading'

const RECORD_CATEGORIES = [
    { value: 'attendance', label: 'Účast', emoji: '👥', color: '#3b82f6' },
    { value: 'pivo', label: 'Pivo', emoji: '🍺', color: '#f59e0b' },
    { value: 'redbull', label: 'Red Bull', emoji: '⚡', color: '#ef4444' },
    { value: 'bueno', label: 'Kinder Bueno', emoji: '🍫', color: '#a855f7' },
    { value: 'jagermeister', label: 'Jägermeister', emoji: '🦌', color: '#22c55e' },
]

export default function RecordsPage() {
    const [records, setRecords] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecords()
    }, [])

    const fetchRecords = async () => {
        try {
            const response = await fetch('/api/records')
            if (response.ok) {
                const data = await response.json()
                setRecords(data.records || [])
            }
        } catch (error) {
            console.error('Error fetching records:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <NestLoading message="Načítám rekordy..." />
    }

    // Group records by category, sorted desc by count
    const groupedRecords: Record<string, any[]> = {}
    records.forEach(r => {
        if (!groupedRecords[r.category]) groupedRecords[r.category] = []
        groupedRecords[r.category].push(r)
    })
    Object.values(groupedRecords).forEach(arr => arr.sort((a: any, b: any) => b.count - a.count))

    return (
        <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)]">
            <div className="max-w-2xl mx-auto px-4 pt-6 pb-12">
                {/* Back link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-[var(--nest-white-40)] hover:text-[var(--nest-yellow)] transition-colors text-sm mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Zpět
                </Link>

                {/* Records Card */}
                <div className="nest-card-elevated overflow-hidden">
                    {/* Header */}
                    <div
                        className="px-6 py-5 text-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 50%, rgba(168, 85, 247, 0.08) 100%)',
                            borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
                        }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Trophy className="w-6 h-6 text-[var(--nest-yellow)]" />
                            <h1 className="text-xl font-bold tracking-tight">Rekordy Nestu</h1>
                        </div>
                        <p className="text-xs text-[var(--nest-white-40)]">
                            Překonej rekordy a zapiš se do síně slávy 🔥
                        </p>
                    </div>

                    {/* Records Grid */}
                    {records.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <div className="text-4xl mb-3">🏆</div>
                            <p className="text-[var(--nest-white-60)] text-sm">Zatím žádné rekordy</p>
                        </div>
                    ) : (
                        <div className="p-4 sm:p-6 space-y-4">
                            {RECORD_CATEGORIES.map(cat => {
                                const catRecords = groupedRecords[cat.value] || []
                                if (catRecords.length === 0) return null

                                return (
                                    <div
                                        key={cat.value}
                                        className="rounded-xl overflow-hidden border border-[var(--nest-dark-4)] bg-[var(--nest-dark-3)]"
                                    >
                                        <div
                                            className="px-4 py-4 flex items-center justify-center gap-2.5"
                                            style={{ borderBottom: '1px solid var(--nest-dark-4)' }}
                                        >
                                            <span className="text-2xl">{cat.emoji}</span>
                                            <span className="text-base font-bold text-[var(--nest-white)]">{cat.label}</span>
                                        </div>

                                        {/* Records List */}
                                        <div className="divide-y" style={{ borderColor: `${cat.color}10` }}>
                                            {catRecords.slice(0, 3).map((record: any, idx: number) => (
                                                <div
                                                    key={record.id}
                                                    className={`px-4 py-2.5 flex items-center gap-3 ${idx === 0 ? 'bg-[var(--nest-yellow)]/5' : ''}`}
                                                >
                                                    <div className="w-8 text-center flex-shrink-0">
                                                        {idx === 0 ? (
                                                            <span className="text-xl">🥇</span>
                                                        ) : idx === 1 ? (
                                                            <span className="text-xl">🥈</span>
                                                        ) : idx === 2 ? (
                                                            <span className="text-xl">🥉</span>
                                                        ) : (
                                                            <span className="text-sm font-bold text-[var(--nest-white-40)]">{idx + 1}.</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-semibold text-sm ${idx === 0 ? 'text-[var(--nest-white)]' : 'text-[var(--nest-white-60)]'}`}>
                                                            {record.group_name}
                                                        </p>
                                                        {record.date && (
                                                            <p className="text-xs text-[var(--nest-white-40)]">
                                                                {new Date(record.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div
                                                        className={`font-bold px-2.5 py-0.5 rounded-lg flex-shrink-0 ${idx === 0 ? 'text-[var(--nest-yellow)] bg-[var(--nest-yellow)]/10 text-lg' : 'text-[var(--nest-white-60)] bg-[var(--nest-dark-4)] text-sm'}`}
                                                    >
                                                        {record.count}×
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div
                        className="px-6 py-4 text-center"
                        style={{
                            borderTop: '1px solid rgba(245, 158, 11, 0.1)',
                            backgroundColor: 'rgba(245, 158, 11, 0.03)',
                        }}
                    >
                        <p className="text-xs text-[var(--nest-white-40)]">
                            💪 Máš na to překonat rekordy? Přihlas se na další akci!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
