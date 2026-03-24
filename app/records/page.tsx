'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ArrowLeft, User, Flame, Crown, Target, X, Calendar, Beer } from 'lucide-react'
import NestLoading from '@/components/NestLoading'
import { useGuestAuth } from '@/lib/auth-context'

const CATEGORIES = [
    { value: 'attendance', label: 'Účast', emoji: '👥' },
    { value: 'pivo', label: 'Pivo', emoji: '🍺' },
    { value: 'redbull', label: 'Red Bull', emoji: '⚡' },
    { value: 'bueno', label: 'Kinder Bueno', emoji: '🍫' },
    { value: 'jagermeister', label: 'Jägermeister', emoji: '🦌' },
]

const CONSUMABLE_CATEGORIES = CATEGORIES.filter(c => c.value !== 'attendance')

interface RankEntry {
    uid: string
    display_name: string
    avatar_url: string | null
    value: number
    event_name?: string
    is_registered?: boolean
}

interface PublicProfile {
    display_name: string
    avatar_url: string | null
    events: Array<{
        name: string
        date: string
        consumption: Record<string, number>
    }>
    totals: Record<string, number>
    event_count: number
}

function Medal({ idx }: { idx: number }) {
    if (idx === 0) return <span className="text-2xl">🥇</span>
    if (idx === 1) return <span className="text-2xl">🥈</span>
    if (idx === 2) return <span className="text-2xl">🥉</span>
    return <span className="text-base font-bold text-[var(--nest-white-40)]">{idx + 1}.</span>
}

/* ═══════ PROFILE POPUP MODAL ═══════ */
function ProfileModal({ uid, onClose }: { uid: string; onClose: () => void }) {
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/leaderboard/${uid}/public`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setProfile(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [uid])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
                style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 hover:bg-[var(--nest-dark-4)] transition-colors"
                >
                    <X className="w-4 h-4 text-[var(--nest-white-60)]" />
                </button>

                {loading ? (
                    <div className="py-16 flex items-center justify-center">
                        <NestLoading message="Načítám profil..." />
                    </div>
                ) : !profile ? (
                    <div className="py-16 text-center">
                        <p className="text-sm text-[var(--nest-white-40)]">Profil se nepodařilo načíst</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-5 pt-5 pb-4 text-center" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--nest-dark-4)', border: '3px solid var(--nest-yellow)' }}>
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                                ) : (
                                    <User className="w-7 h-7 text-[var(--nest-white-40)]" />
                                )}
                            </div>
                            <h3 className="text-lg font-bold">{profile.display_name}</h3>
                            <p className="text-xs text-[var(--nest-white-40)] mt-1">
                                {profile.event_count} {profile.event_count === 1 ? 'event' : profile.event_count < 5 ? 'eventy' : 'eventů'}
                            </p>
                        </div>

                        {/* Total consumption */}
                        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                            <h4 className="text-xs font-bold text-[var(--nest-white-40)] uppercase tracking-wider mb-3">Celková spotřeba</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {CONSUMABLE_CATEGORIES.map(cat => {
                                    const val = profile.totals[cat.value] || 0
                                    return (
                                        <div key={cat.value} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--nest-dark-3)' }}>
                                            <span className="text-base">{cat.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[10px] text-[var(--nest-white-40)] block">{cat.label}</span>
                                                <span className="text-sm font-bold">{val}×</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Event history */}
                        <div className="px-5 py-4">
                            <h4 className="text-xs font-bold text-[var(--nest-white-40)] uppercase tracking-wider mb-3">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Historie eventů
                            </h4>
                            {profile.events.length === 0 ? (
                                <p className="text-xs text-[var(--nest-white-40)] text-center py-3">Žádné eventy</p>
                            ) : (
                                <div className="space-y-2">
                                    {profile.events.map((event, i) => (
                                        <div key={i} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--nest-dark-3)' }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-bold truncate">{event.name}</span>
                                                {event.date && (
                                                    <span className="text-[10px] text-[var(--nest-white-40)] flex-shrink-0 ml-2">
                                                        {new Date(event.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-3 text-[10px] text-[var(--nest-white-60)]">
                                                {CONSUMABLE_CATEGORIES.map(cat => {
                                                    const val = event.consumption[cat.value] || 0
                                                    if (val === 0) return null
                                                    return (
                                                        <span key={cat.value} className="flex items-center gap-0.5">
                                                            <span>{cat.emoji}</span>
                                                            <span className="font-bold">{val}</span>
                                                        </span>
                                                    )
                                                })}
                                                {CONSUMABLE_CATEGORIES.every(cat => (event.consumption[cat.value] || 0) === 0) && (
                                                    <span className="text-[var(--nest-white-40)]">Bez spotřeby</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

/* ═══════ PODIUM COMPONENT ═══════ */
function Podium({ entries, currentUid, unit, onUserClick }: { entries: RankEntry[]; currentUid?: string; unit?: string; onUserClick?: (uid: string) => void }) {
    if (entries.length === 0) return <p className="text-xs text-center py-4 text-[var(--nest-white-40)]">Zatím žádná data</p>

    const isCurrentUser = (entry: RankEntry) => {
        if (!currentUid) return false
        return entry.uid === currentUid
    }

    const handleClick = (entry: RankEntry) => {
        if (entry.is_registered && onUserClick) {
            onUserClick(entry.uid)
        }
    }

    const top3 = entries.slice(0, 3)
    const rest = entries.slice(3, 10)

    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3
    const podiumHeights = ['h-16', 'h-24', 'h-12']
    const podiumColors = ['bg-gray-400/20', 'bg-[var(--nest-yellow)]/20', 'bg-amber-700/20']

    return (
        <div>
            {top3.length >= 3 && (
                <div className="flex items-end justify-center gap-2 mb-4 px-4 pt-3">
                    {podiumOrder.map((entry, i) => {
                        const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2
                        const isMe = isCurrentUser(entry)
                        const clickable = entry.is_registered && onUserClick
                        return (
                            <div
                                key={entry.uid}
                                className={`flex flex-col items-center flex-1 max-w-[120px] ${clickable ? 'cursor-pointer group' : ''}`}
                                onClick={() => handleClick(entry)}
                            >
                                <div className="relative">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 transition-all ${clickable ? 'group-hover:ring-2 group-hover:ring-[var(--nest-yellow)]/50' : ''}`}
                                        style={{ backgroundColor: 'var(--nest-dark-4)', border: isMe ? '2px solid var(--nest-yellow)' : '2px solid transparent' }}
                                    >
                                        {entry.avatar_url ? (
                                            <img src={entry.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-[var(--nest-white-40)]" />
                                        )}
                                    </div>
                                    {entry.is_registered && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-[var(--nest-dark)]" title="Registrovaný" />
                                    )}
                                </div>
                                <span className={`text-[10px] font-semibold text-center truncate max-w-full transition-colors ${isMe ? 'text-[var(--nest-yellow)]' : clickable ? 'text-[var(--nest-white-60)] group-hover:text-[var(--nest-yellow)]' : 'text-[var(--nest-white-60)]'}`}>
                                    {entry.display_name}
                                </span>
                                <div className={`w-full ${podiumHeights[i]} ${podiumColors[i]} rounded-t-lg flex flex-col items-center justify-end pb-1 mt-1`}>
                                    <Medal idx={realIdx} />
                                    <span className="text-xs font-bold text-[var(--nest-white)]">{entry.value}{unit || '×'}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {(top3.length < 3 ? entries : rest).length > 0 && (
                <div className="divide-y divide-[var(--nest-dark-4)]">
                    {(top3.length < 3 ? entries : rest).map((entry, i) => {
                        const idx = top3.length < 3 ? i : i + 3
                        const isMe = isCurrentUser(entry)
                        const clickable = entry.is_registered && onUserClick
                        return (
                            <div
                                key={entry.uid}
                                className={`px-4 py-2 flex items-center gap-3 ${isMe ? 'bg-[var(--nest-yellow)]/5' : ''} ${clickable ? 'cursor-pointer hover:bg-[var(--nest-white)]/5 transition-colors' : ''}`}
                                onClick={() => handleClick(entry)}
                            >
                                <div className="w-7 text-center flex-shrink-0">
                                    {top3.length < 3 ? <Medal idx={idx} /> : <span className="text-xs font-bold text-[var(--nest-white-40)]">{idx + 1}.</span>}
                                </div>
                                <div className="relative w-6 h-6 flex-shrink-0">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--nest-dark-4)' }}>
                                        {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" /> : <User className="w-3 h-3 text-[var(--nest-white-40)]" />}
                                    </div>
                                    {entry.is_registered && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-[var(--nest-dark)]" title="Registrovaný" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-xs font-medium truncate block ${isMe ? 'text-[var(--nest-yellow)]' : 'text-[var(--nest-white-60)]'}`}>
                                        {entry.display_name}{isMe ? ' (ty)' : ''}
                                    </span>
                                    {entry.event_name && <span className="text-[10px] text-[var(--nest-white-40)] block truncate">{entry.event_name}</span>}
                                </div>
                                <span className="text-xs font-bold text-[var(--nest-white-60)] flex-shrink-0">{entry.value}{unit || '×'}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/* ═══════ MAIN PAGE ═══════ */
export default function RecordsPage() {
    const router = useRouter()
    const { userProfile } = useGuestAuth()
    const [records, setRecords] = useState<any[]>([])
    const [leaderboard, setLeaderboard] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedPersonalCategory, setSelectedPersonalCategory] = useState('pivo')
    const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([fetchRecords(), fetchLeaderboard()]).then(() => setLoading(false))
    }, [])

    const fetchRecords = async () => {
        try {
            const res = await fetch('/api/records')
            if (res.ok) { const data = await res.json(); setRecords(data.records || []) }
        } catch { }
    }

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/leaderboard')
            if (res.ok) setLeaderboard(await res.json())
        } catch { }
    }

    if (loading) return <NestLoading message="Načítám rekordy..." />

    const groupedRecords: Record<string, any[]> = {}
    records.forEach(r => {
        if (!groupedRecords[r.category]) groupedRecords[r.category] = []
        groupedRecords[r.category].push(r)
    })
    Object.values(groupedRecords).forEach(arr => arr.sort((a: any, b: any) => b.count - a.count))

    const totalData = leaderboard?.total || {}
    const bestEventData = leaderboard?.best_event || {}

    return (
        <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)]">
            <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
                <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-[var(--nest-white-40)] hover:text-[var(--nest-yellow)] transition-colors text-sm mb-6">
                    <ArrowLeft className="w-4 h-4" /> Zpět
                </button>

                {/* Hero header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center gap-3 mb-3">
                        <Trophy className="w-8 h-8 text-[var(--nest-yellow)]" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Síň slávy</h1>
                        <Flame className="w-8 h-8 text-orange-500" />
                    </div>
                    <p className="text-sm text-[var(--nest-white-40)] max-w-md mx-auto">
                        Skupinové rekordy z eventů a TOPka jednotlivců. Zaregistruj se a bojuj o místo!
                    </p>
                </div>

                {/* ═══════ SECTION 1: GROUP RECORDS ═══════ */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-5">
                        <Crown className="w-5 h-5 text-[var(--nest-yellow)]" />
                        <h2 className="text-xl font-bold">Skupinové rekordy</h2>
                        <span className="text-xs text-[var(--nest-white-40)] ml-1">z eventů</span>
                    </div>

                    {records.length === 0 ? (
                        <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                            <Trophy className="w-10 h-10 mx-auto mb-2 text-[var(--nest-white-40)]" />
                            <p className="text-sm text-[var(--nest-white-60)]">Zatím žádné rekordy</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {CATEGORIES.map(cat => {
                                const catRecords = groupedRecords[cat.value] || []
                                if (catRecords.length === 0) return null
                                return (
                                    <div key={cat.value} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                                        <div className="px-4 py-3 flex items-center justify-center gap-2" style={{ borderBottom: '1px solid var(--nest-border)' }}>
                                            <span className="text-xl">{cat.emoji}</span>
                                            <span className="text-sm font-bold">{cat.label}</span>
                                        </div>
                                        <div className="divide-y divide-[var(--nest-dark-4)]">
                                            {catRecords.slice(0, 3).map((record: any, idx: number) => (
                                                <div key={record.id} className={`px-4 py-2.5 flex items-center gap-3 ${idx === 0 ? 'bg-[var(--nest-yellow)]/5' : ''}`}>
                                                    <div className="w-8 text-center flex-shrink-0"><Medal idx={idx} /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-semibold text-sm ${idx === 0 ? 'text-[var(--nest-white)]' : 'text-[var(--nest-white-60)]'}`}>{record.group_name}</p>
                                                        {record.date && <p className="text-xs text-[var(--nest-white-40)]">{new Date(record.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                                                    </div>
                                                    <div className={`font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${idx === 0 ? 'text-[var(--nest-yellow)] bg-[var(--nest-yellow)]/10 text-lg' : 'text-[var(--nest-white-60)] bg-[var(--nest-dark-4)] text-sm'}`}>
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
                </div>

                {/* ═══════ SECTION 2: PERSONAL LEADERBOARD ═══════ */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-5">
                        <Target className="w-5 h-5 text-green-400" />
                        <h2 className="text-xl font-bold">TOPka jednotlivců</h2>
                        <span className="text-xs text-[var(--nest-white-40)] ml-1">kdo vypil a snědl nejvíc?</span>
                    </div>

                    {/* Category selector pills */}
                    <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                        {CONSUMABLE_CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedPersonalCategory(cat.value)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                                style={{
                                    backgroundColor: selectedPersonalCategory === cat.value ? 'var(--nest-yellow)' : 'var(--nest-dark-3)',
                                    color: selectedPersonalCategory === cat.value ? 'var(--nest-dark)' : 'var(--nest-white-60)',
                                    border: `1px solid ${selectedPersonalCategory === cat.value ? 'var(--nest-yellow)' : 'var(--nest-dark-4)'}`,
                                }}
                            >
                                <span>{cat.emoji}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Two cards: Total + Best event */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                            <div className="px-4 py-3 flex items-center justify-center gap-2" style={{ borderBottom: '1px solid var(--nest-border)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))' }}>
                                <Flame className="w-4 h-4 text-orange-400" />
                                <span className="text-sm font-bold">Celkem za všechny eventy</span>
                            </div>
                            <Podium
                                entries={totalData[selectedPersonalCategory] || []}
                                currentUid={userProfile?.uid}
                                onUserClick={uid => setSelectedProfileUid(uid)}
                            />
                        </div>

                        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                            <div className="px-4 py-3 flex items-center justify-center gap-2" style={{ borderBottom: '1px solid var(--nest-border)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))' }}>
                                <Trophy className="w-4 h-4 text-green-400" />
                                <span className="text-sm font-bold">Rekord za jeden event</span>
                            </div>
                            <Podium
                                entries={bestEventData[selectedPersonalCategory] || []}
                                currentUid={userProfile?.uid}
                                onUserClick={uid => setSelectedProfileUid(uid)}
                            />
                        </div>
                    </div>

                    {/* Attendance leaderboard */}
                    <div className="mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--nest-surface)', border: '1px solid var(--nest-border)' }}>
                        <div className="px-4 py-3 flex items-center justify-center gap-2" style={{ borderBottom: '1px solid var(--nest-border)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))' }}>
                            <span className="text-lg">👥</span>
                            <span className="text-sm font-bold">Účast na eventech</span>
                        </div>
                        <Podium
                            entries={totalData.attendance || []}
                            currentUid={userProfile?.uid}
                            onUserClick={uid => setSelectedProfileUid(uid)}
                        />
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="text-center py-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.03))', border: '1px solid var(--nest-border)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--nest-yellow)' }}>Chceš se dostat do žebříčku?</p>
                    <p className="text-xs text-[var(--nest-white-40)]">
                        Zaregistruj se, spáruj účet a tvoje statistiky se začnou počítat!
                    </p>
                </div>
            </div>

            {/* Profile popup modal */}
            {selectedProfileUid && (
                <ProfileModal uid={selectedProfileUid} onClose={() => setSelectedProfileUid(null)} />
            )}
        </div>
    )
}
