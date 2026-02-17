'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Gamepad2, Plus, ThumbsUp, Loader2, Trophy, Sparkles, Library } from 'lucide-react'
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

            {/* Library games to suggest — quick pick buttons */}
            {unaddedLibraryGames.length > 0 && currentGuest && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-[var(--nest-text-primary)] mb-3 flex items-center gap-2">
                        <Library className="w-5 h-5 text-[var(--nest-yellow)]" />
                        Dostupné hry k instalaci
                    </h2>
                    <p className="text-sm text-[var(--nest-text-tertiary)] mb-3">
                        Klikni na hru pro navržení na event — ostatní pro ni mohou hlasovat:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {unaddedLibraryGames.map(lg => (
                            <button
                                key={lg.id}
                                onClick={async () => {
                                    if (!currentGuest || submitting) return
                                    try {
                                        setSubmitting(true)
                                        const res = await fetch(`/api/event/${slug}/games`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                action: 'suggest',
                                                guest_id: currentGuest.id,
                                                name: lg.name,
                                            }),
                                        })
                                        if (res.ok) {
                                            await fetchData()
                                        }
                                    } catch (error) {
                                        console.error('Error suggesting library game:', error)
                                    } finally {
                                        setSubmitting(false)
                                    }
                                }}
                                disabled={submitting}
                                className="group relative px-3 py-2 rounded-xl bg-[var(--nest-yellow)]/5 hover:bg-[var(--nest-yellow)]/10 border border-[var(--nest-yellow)]/20 hover:border-[var(--nest-yellow)]/40 transition-all text-left disabled:opacity-50"
                            >
                                <span className="font-medium text-[var(--nest-text-primary)] text-sm">{lg.name}</span>
                                {lg.category && (
                                    <span className="ml-1.5 text-[10px] text-[var(--nest-text-tertiary)]">({lg.category})</span>
                                )}
                                <span className="ml-1.5 text-xs text-[var(--nest-yellow)]/60 group-hover:text-[var(--nest-yellow)]">+ navrhnout</span>
                            </button>
                        ))}
                    </div>
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
