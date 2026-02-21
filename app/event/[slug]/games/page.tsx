'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Gamepad2, Plus, ThumbsUp, Loader2, Trophy, Sparkles, Library, Monitor, ChevronRight } from 'lucide-react'
import NestPage from '@/components/NestPage'
import { Session, Game, GameVote, GameLibraryItem } from '@/types/database.types'
import { guestStorage } from '@/lib/guest-storage'
import NestLoading from '@/components/NestLoading'

export default function EventGamesPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [session, setSession] = useState<Session | null>(null)
    const [games, setGames] = useState<Game[]>([])
    const [votes, setVotes] = useState<GameVote[]>([])
    const [libraryGames, setLibraryGames] = useState<GameLibraryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [newGameName, setNewGameName] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [votingId, setVotingId] = useState<string | null>(null)

    const currentGuest = typeof window !== 'undefined' ? guestStorage.getCurrentGuest(slug) : null

    useEffect(() => {
        if (slug) fetchData()
    }, [slug])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch session
            const sessionRes = await fetch(`/api/event/${slug}`)
            if (sessionRes.ok) {
                const data = await sessionRes.json()
                setSession(data.session)
            }

            // Fetch games for this event
            const gamesRes = await fetch(`/api/event/${slug}/games`)
            if (gamesRes.ok) {
                const data = await gamesRes.json()
                setGames(data.games || [])
                setVotes(data.votes || [])
            }

            // Fetch global game library
            const libRes = await fetch('/api/game-library')
            if (libRes.ok) {
                const libData = await libRes.json()
                setLibraryGames(libData.games || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSuggestGame = async () => {
        if (!newGameName.trim() || !currentGuest) return

        try {
            setSubmitting(true)
            const res = await fetch(`/api/event/${slug}/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'suggest',
                    guest_id: currentGuest.id,
                    name: newGameName.trim(),
                }),
            })

            if (res.ok) {
                setNewGameName('')
                await fetchData()
            }
        } catch (error) {
            console.error('Error suggesting game:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleVote = async (gameId: string) => {
        if (!currentGuest) return

        try {
            setVotingId(gameId)
            const res = await fetch(`/api/event/${slug}/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'vote',
                    guest_id: currentGuest.id,
                    game_id: gameId,
                }),
            })

            if (res.ok) {
                await fetchData()
            }
        } catch (error) {
            console.error('Error voting:', error)
        } finally {
            setVotingId(null)
        }
    }

    const hasVoted = (gameId: string): boolean => {
        if (!currentGuest) return false
        return votes.some(v => v.game_id === gameId && v.guest_id === currentGuest.id)
    }

    if (loading) {
        return <NestLoading message="Načítám hry..." />
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)] flex items-center justify-center p-4">
                <div className="nest-card-elevated p-8 text-center max-w-md">
                    <p className="text-6xl mb-4">😕</p>
                    <h2 className="text-xl font-bold mb-2">Event nenalezen</h2>
                    <Link href="/" className="text-[var(--nest-yellow)] hover:underline font-medium">
                        ← Zpět na hlavní stránku
                    </Link>
                </div>
            </div>
        )
    }

    const adminPicks = games.filter(g => g.is_admin_pick)
    const communityPicks = games.filter(g => !g.is_admin_pick)

    // Library games that are NOT yet added to this event (available to quick-suggest)
    const unaddedLibraryGames = libraryGames.filter(
        lg => !games.some(g => g.name.toLowerCase() === lg.name.toLowerCase())
    )

    return (
        <NestPage sessionSlug={slug} backHref={`/event/${slug}`} title="Hry na LAN" maxWidth="max-w-2xl">

            {!currentGuest && (
                <div className="bg-[var(--nest-warning)]/10 border border-[var(--nest-warning)]/30 rounded-xl p-4 mb-6 text-center">
                    <p className="text-[var(--nest-warning)] font-medium text-sm">
                        Pro hlasování a přidávání her se nejdřív{' '}
                        <Link href={`/event/${slug}/register`} className="text-[var(--nest-yellow)] underline font-bold">
                            zaregistruj
                        </Link>
                    </p>
                </div>
            )}

            {/* Admin picks */}
            {adminPicks.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-[var(--nest-text-primary)] mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Hlavní program
                    </h2>
                    <div className="space-y-2">
                        {adminPicks.map(game => (
                            <div
                                key={game.id}
                                className="bg-gradient-to-r from-amber-900/20 to-yellow-900/15 border border-amber-700/30 rounded-xl p-4 flex items-center gap-4"
                            >
                                <div className="flex-1">
                                    <span className="font-bold text-[var(--nest-text-primary)] text-lg">{game.name}</span>
                                    <span className="ml-2 text-xs bg-amber-800/30 text-amber-400 px-2 py-0.5 rounded-full">
                                        ⭐ Vybraná hra
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[var(--nest-text-secondary)]">{game.votes || 0}</span>
                                    <button
                                        onClick={() => handleVote(game.id)}
                                        disabled={!currentGuest || votingId === game.id}
                                        className={`p-2.5 rounded-xl transition-all ${hasVoted(game.id)
                                            ? 'bg-[var(--nest-yellow)] text-[var(--nest-bg)] shadow-lg shadow-[var(--nest-yellow)]/20 scale-110'
                                            : 'bg-[var(--nest-surface-alt)] text-[var(--nest-text-tertiary)] hover:text-[var(--nest-yellow)] hover:bg-[var(--nest-yellow)]/10 border border-[var(--nest-border)]'
                                            } ${!currentGuest ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {votingId === game.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <ThumbsUp className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pre-installed games info section */}
            {libraryGames.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-[var(--nest-text-primary)] mb-3 flex items-center gap-2">
                        <Library className="w-5 h-5 text-[var(--nest-yellow)]" />
                        Hry k předinstalaci
                    </h2>

                    {/* Info banner */}
                    <div className="bg-gradient-to-r from-[var(--nest-yellow)]/5 to-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20 rounded-xl p-4 mb-4">
                        <p className="text-sm text-[var(--nest-text-secondary)] leading-relaxed">
                            💡 Pokud si <strong className="text-[var(--nest-text-primary)]">rezervuješ PC</strong>, můžeš mít tyto hry <strong className="text-[var(--nest-text-primary)]">předinstalované a připravené ke hraní</strong> hned po příchodu. Nemusíš nic stahovat!
                        </p>
                        <Link
                            href={`/event/${slug}/hardware`}
                            className="mt-3 inline-flex items-center gap-2 bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] text-[var(--nest-bg)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[var(--nest-yellow)]/20"
                        >
                            <Monitor className="w-4 h-4" />
                            Rezervovat PC
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Games list grouped by category */}
                    {(() => {
                        const availableGames = libraryGames.filter(g => g.is_available)
                        const grouped = availableGames.reduce((acc, game) => {
                            const cat = game.category || 'Ostatní'
                            if (!acc[cat]) acc[cat] = []
                            acc[cat].push(game)
                            return acc
                        }, {} as Record<string, GameLibraryItem[]>)

                        const categoryOrder = ['FPS', 'RTS', 'Racing', 'Sport', 'Party', 'Ostatní']
                        const sortedCategories = Object.keys(grouped).sort((a, b) => {
                            const ai = categoryOrder.indexOf(a)
                            const bi = categoryOrder.indexOf(b)
                            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
                        })

                        return (
                            <div className="space-y-3">
                                {sortedCategories.map(cat => (
                                    <div key={cat} className="bg-[var(--nest-surface)] border border-[var(--nest-border)] rounded-xl overflow-hidden">
                                        <div className="px-4 py-2 bg-[var(--nest-surface-alt)] border-b border-[var(--nest-border)]">
                                            <span className="text-sm font-bold text-[var(--nest-text-secondary)]">
                                                {cat}
                                            </span>
                                            <span className="ml-2 text-xs text-[var(--nest-text-tertiary)]">
                                                ({grouped[cat].length})
                                            </span>
                                        </div>
                                        <div className="divide-y divide-[var(--nest-border)]">
                                            {grouped[cat].sort((a, b) => a.name.localeCompare(b.name)).map(game => (
                                                <div key={game.id} className="flex items-center gap-3 px-4 py-2.5">
                                                    <Gamepad2 className="w-4 h-4 flex-shrink-0 text-[var(--nest-text-tertiary)]" />
                                                    <span className="font-medium text-[var(--nest-text-primary)] text-sm">{game.name}</span>
                                                    {game.max_players && (
                                                        <span className="ml-auto text-xs text-[var(--nest-text-tertiary)]">
                                                            max {game.max_players} hráčů
                                                        </span>
                                                    )}
                                                    {game.notes && (
                                                        <span className="text-xs text-[var(--nest-text-tertiary)]">
                                                            {game.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })()}
                </div>
            )}

            {/* Community suggestions */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-[var(--nest-text-primary)] mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--nest-yellow)]" />
                    Návrhy od hráčů
                </h2>

                {communityPicks.length > 0 ? (
                    <div className="space-y-2">
                        {communityPicks.map(game => (
                            <div
                                key={game.id}
                                className="bg-[var(--nest-surface)] border border-[var(--nest-border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--nest-border-light)] transition-all"
                            >
                                <div className="flex-1">
                                    <span className="font-semibold text-[var(--nest-text-primary)]">{game.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[var(--nest-text-secondary)]">{game.votes || 0}</span>
                                    <button
                                        onClick={() => handleVote(game.id)}
                                        disabled={!currentGuest || votingId === game.id}
                                        className={`p-2.5 rounded-xl transition-all ${hasVoted(game.id)
                                            ? 'bg-[var(--nest-yellow)] text-[var(--nest-bg)] shadow-lg shadow-[var(--nest-yellow)]/20 scale-110'
                                            : 'bg-[var(--nest-surface-alt)] text-[var(--nest-text-tertiary)] hover:text-[var(--nest-yellow)] hover:bg-[var(--nest-yellow)]/10 border border-[var(--nest-border)]'
                                            } ${!currentGuest ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {votingId === game.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <ThumbsUp className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[var(--nest-surface)] border border-dashed border-[var(--nest-border)] rounded-xl p-6 text-center">
                        <Gamepad2 className="w-10 h-10 text-[var(--nest-text-tertiary)] mx-auto mb-2" />
                        <p className="text-[var(--nest-text-tertiary)] text-sm">Zatím žádné návrhy. Buď první!</p>
                    </div>
                )}
            </div>

            {/* Suggest new game */}
            {currentGuest && (
                <div className="bg-[var(--nest-surface)] rounded-xl shadow-lg p-5 border border-[var(--nest-border)]">
                    <h3 className="font-bold text-[var(--nest-text-primary)] mb-3 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[var(--nest-yellow)]" />
                        Navrhnout hru
                    </h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newGameName}
                            onChange={(e) => setNewGameName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSuggestGame()}
                            placeholder="Název hry (např. Counter-Strike 2)"
                            className="flex-1 bg-[var(--nest-bg)] border border-[var(--nest-border)] rounded-xl px-4 py-3 text-[var(--nest-text-primary)] placeholder:text-[var(--nest-text-tertiary)] focus:ring-2 focus:ring-[var(--nest-yellow)]/50 focus:border-[var(--nest-yellow)]/50 outline-none"
                        />
                        <button
                            onClick={handleSuggestGame}
                            disabled={!newGameName.trim() || submitting}
                            className="bg-[var(--nest-yellow)] hover:bg-[var(--nest-yellow-dark)] disabled:bg-[var(--nest-border)] text-[var(--nest-bg)] px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Přidat
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </NestPage>
    )
}
