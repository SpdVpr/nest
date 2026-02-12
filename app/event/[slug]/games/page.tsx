'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Gamepad2, Plus, ThumbsUp, Loader2, Trophy, Sparkles, Library } from 'lucide-react'
import { Session, Game, GameVote, GameLibraryItem } from '@/types/database.types'
import { guestStorage } from '@/lib/guest-storage'
import EventGuestHeader from '@/components/EventGuestHeader'

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
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin text-6xl mb-4">🎮</div>
                    <p className="text-gray-600">Načítám hry...</p>
                </div>
            </div>
        )
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <p className="text-6xl mb-4">😕</p>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Event nenalezen</h2>
                    <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium">
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
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-4 pb-32">
            <EventGuestHeader session_slug={slug} />

            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Link
                        href={`/event/${slug}`}
                        className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            🎮 Hry na LAN
                        </h1>
                        <p className="text-sm text-gray-500">{session.name}</p>
                    </div>
                </div>

                {!currentGuest && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
                        <p className="text-amber-800 font-medium">
                            Pro hlasování a přidávání her se nejdřív{' '}
                            <Link href={`/event/${slug}/register`} className="text-amber-900 underline font-bold">
                                zaregistruj
                            </Link>
                        </p>
                    </div>
                )}

                {/* Admin picks */}
                {adminPicks.length > 0 && (
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Hlavní program
                        </h2>
                        <div className="space-y-2">
                            {adminPicks.map(game => (
                                <div
                                    key={game.id}
                                    className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4"
                                >
                                    <div className="flex-1">
                                        <span className="font-bold text-gray-900 text-lg">{game.name}</span>
                                        <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                            ⭐ Vybraná hra
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-700">{game.votes || 0}</span>
                                        <button
                                            onClick={() => handleVote(game.id)}
                                            disabled={!currentGuest || votingId === game.id}
                                            className={`p-2.5 rounded-xl transition-all ${hasVoted(game.id)
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-110'
                                                : 'bg-white text-gray-400 hover:text-purple-600 hover:bg-purple-50 border border-gray-200'
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
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Library className="w-5 h-5 text-violet-500" />
                            Dostupné hry k instalaci
                        </h2>
                        <p className="text-sm text-gray-500 mb-3">
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
                                    className="group relative px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-400 transition-all text-left disabled:opacity-50"
                                >
                                    <span className="font-medium text-violet-800 text-sm">{lg.name}</span>
                                    {lg.category && (
                                        <span className="ml-1.5 text-[10px] text-violet-400">({lg.category})</span>
                                    )}
                                    <span className="ml-1.5 text-xs text-violet-400 group-hover:text-violet-600">+ navrhnout</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Community suggestions */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Návrhy od hráčů
                    </h2>

                    {communityPicks.length > 0 ? (
                        <div className="space-y-2">
                            {communityPicks.map(game => (
                                <div
                                    key={game.id}
                                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all"
                                >
                                    <div className="flex-1">
                                        <span className="font-semibold text-gray-900">{game.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-700">{game.votes || 0}</span>
                                        <button
                                            onClick={() => handleVote(game.id)}
                                            disabled={!currentGuest || votingId === game.id}
                                            className={`p-2.5 rounded-xl transition-all ${hasVoted(game.id)
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-110'
                                                : 'bg-white text-gray-400 hover:text-purple-600 hover:bg-purple-50 border border-gray-200'
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
                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
                            <Gamepad2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Zatím žádné návrhy. Buď první!</p>
                        </div>
                    )}
                </div>

                {/* Suggest new game */}
                {currentGuest && (
                    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-green-600" />
                            Navrhnout hru
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newGameName}
                                onChange={(e) => setNewGameName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSuggestGame()}
                                placeholder="Název hry (např. Counter-Strike 2)"
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                            <button
                                onClick={handleSuggestGame}
                                disabled={!newGameName.trim() || submitting}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
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
            </div>
        </div>
    )
}
