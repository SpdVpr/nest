// Shared achievement definitions used both by the user profile UI and the
// server-side rarity aggregator. Keeping the rules in one place guarantees
// the client and server always agree on who has earned what.

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type AchievementGroup = 'attendance' | 'beer' | 'energy' | 'sweets' | 'alcohol' | 'spending' | 'social' | 'special'

export interface UserStats {
    eventCount: number
    totalNights: number
    maxNightsInEvent: number
    totalSpent: number
    maxSpendingInEvent: number
    totalBeers: number
    maxBeersInEvent: number
    totalRedbull: number
    totalBueno: number
    totalJager: number
    totalTip: number
    maxItemsInEvent: number
    maxGameVotesInEvent: number
    wasFirstRegistered: boolean
}

export interface AchievementProgress {
    earned: boolean
    current: number
    target: number
}

export interface AchievementSpec {
    id: string
    name: string
    emoji: string
    desc: string
    tier: AchievementTier
    group: AchievementGroup
    evaluate: (stats: UserStats) => AchievementProgress
}

const progress = (current: number, target: number): AchievementProgress => ({
    earned: current >= target,
    current: Math.min(current, target),
    target,
})

const flag = (cond: boolean): AchievementProgress => ({
    earned: cond,
    current: cond ? 1 : 0,
    target: 1,
})

export const ACHIEVEMENTS: AchievementSpec[] = [
    // Účast
    { id: 'first_visit', name: 'První návštěva', emoji: '🎉', desc: 'Účast na 1 eventu', tier: 'bronze', group: 'attendance',
      evaluate: s => progress(s.eventCount, 1) },
    { id: 'veteran', name: 'Veterán', emoji: '🎖️', desc: 'Účast na 5 eventech', tier: 'silver', group: 'attendance',
      evaluate: s => progress(s.eventCount, 5) },
    { id: 'nestar', name: 'Nestař', emoji: '👑', desc: 'Účast na 10 eventech', tier: 'gold', group: 'attendance',
      evaluate: s => progress(s.eventCount, 10) },
    { id: 'stalice', name: 'Stálice', emoji: '⭐', desc: 'Účast na 20 eventech', tier: 'platinum', group: 'attendance',
      evaluate: s => progress(s.eventCount, 20) },

    // Pivo — celkem
    { id: 'pivni_zacatecnik', name: 'Pivní začátečník', emoji: '🍻', desc: '10 piv celkem', tier: 'bronze', group: 'beer',
      evaluate: s => progress(s.totalBeers, 10) },
    { id: 'pivni_nadsenec', name: 'Pivní nadšenec', emoji: '🍺', desc: '50 piv celkem', tier: 'silver', group: 'beer',
      evaluate: s => progress(s.totalBeers, 50) },
    { id: 'pivni_kral', name: 'Pivní král', emoji: '👑', desc: '100 piv celkem', tier: 'gold', group: 'beer',
      evaluate: s => progress(s.totalBeers, 100) },
    { id: 'tanker', name: 'Tanker', emoji: '🛢️', desc: '15 piv na jednom eventu', tier: 'silver', group: 'beer',
      evaluate: s => progress(s.maxBeersInEvent, 15) },

    // Energy / sladkosti / alkohol
    { id: 'redbull_addict', name: 'Red Bull addict', emoji: '⚡', desc: '20 Red Bullů celkem', tier: 'silver', group: 'energy',
      evaluate: s => progress(s.totalRedbull, 20) },
    { id: 'bueno_mistr', name: 'Mistr Buena', emoji: '🍫', desc: '15 Kinder Bueno celkem', tier: 'silver', group: 'sweets',
      evaluate: s => progress(s.totalBueno, 15) },
    { id: 'lovec', name: 'Lovec', emoji: '🦌', desc: '5 Jägermeisterů celkem', tier: 'silver', group: 'alcohol',
      evaluate: s => progress(s.totalJager, 5) },

    // Útrata
    { id: 'big_spender', name: 'Big spender', emoji: '💸', desc: 'Útrata 5 000+ Kč na eventu', tier: 'silver', group: 'spending',
      evaluate: s => progress(s.maxSpendingInEvent, 5000) },
    { id: 'whale', name: 'Whale', emoji: '🐋', desc: 'Útrata 15 000+ Kč celkem', tier: 'gold', group: 'spending',
      evaluate: s => progress(s.totalSpent, 15000) },
    { id: 'velkoryse', name: 'Velkorysý', emoji: '💖', desc: '1 000+ Kč spropitné celkem', tier: 'silver', group: 'spending',
      evaluate: s => progress(s.totalTip, 1000) },

    // Speciální
    { id: 'early_bird', name: 'Early bird', emoji: '🐦', desc: 'První registrace alespoň na jednom eventu', tier: 'silver', group: 'special',
      evaluate: s => flag(s.wasFirstRegistered) },
    { id: 'maraton', name: 'Maraton', emoji: '🏃', desc: '5+ nocí na jednom eventu', tier: 'silver', group: 'special',
      evaluate: s => progress(s.maxNightsInEvent, 5) },
    { id: 'stavebni_material', name: 'Stavební materiál', emoji: '🏗️', desc: '20+ nocí celkem', tier: 'gold', group: 'special',
      evaluate: s => progress(s.totalNights, 20) },
    { id: 'nevybiravy', name: 'Nevybíravý', emoji: '🛒', desc: '20+ kusů občerstvení na jednom eventu', tier: 'bronze', group: 'special',
      evaluate: s => progress(s.maxItemsInEvent, 20) },
    { id: 'hrac', name: 'Hráč', emoji: '🎮', desc: '5+ hlasů pro hry na jednom eventu', tier: 'bronze', group: 'social',
      evaluate: s => progress(s.maxGameVotesInEvent, 5) },
]

export const TIER_RANK: Record<AchievementTier, number> = {
    bronze: 0,
    silver: 1,
    gold: 2,
    platinum: 3,
}

export const GROUP_LABELS: Record<AchievementGroup, string> = {
    attendance: 'Účast',
    beer: 'Pivo',
    energy: 'Energy',
    sweets: 'Sladkosti',
    alcohol: 'Alkohol',
    spending: 'Útrata',
    social: 'Komunita',
    special: 'Speciální',
}

// Keyword matchers must match the rules used in /api/leaderboard so users
// see consistent counts across the app.
const matchers: Record<'pivo' | 'redbull' | 'bueno' | 'jagermeister', (name: string, category: string) => boolean> = {
    pivo: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('pivo') || l.includes('beer') || l.includes('plzeň') || l.includes('pilsner') || l.includes('lager') || l.includes('kozel') || l.includes('staropramen') || l.includes('budvar') || l.includes('gambrinus') },
    redbull: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('red bull') || l.includes('redbull') },
    bueno: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('bueno') || l.includes('kinder') },
    jagermeister: (n, c) => { const l = (n + ' ' + c).toLowerCase(); return l.includes('jäger') || l.includes('jager') || l.includes('jägermeister') || l.includes('jagermeister') },
}

interface ConsumptionLite { name?: string; category?: string; qty: number }
interface EventLite {
    nights_count: number
    grandTotal: number
    tip: number
    consumption: ConsumptionLite[]
    registrationOrder?: number
    gameVoteCount?: number
}

// Compute aggregate stats from a user's events. Used by both the profile
// page and the rarity aggregator so the same numbers drive both displays.
export function computeUserStats(events: EventLite[]): UserStats {
    let totalBeers = 0, maxBeersInEvent = 0
    let totalRedbull = 0, totalBueno = 0, totalJager = 0
    let totalNights = 0, maxNightsInEvent = 0
    let totalSpent = 0, maxSpendingInEvent = 0
    let totalTip = 0
    let maxItemsInEvent = 0
    let maxGameVotesInEvent = 0
    let wasFirstRegistered = false

    for (const e of events) {
        let eventBeers = 0
        let eventItems = 0
        for (const c of e.consumption || []) {
            const qty = c.qty || 0
            eventItems += qty
            const name = c.name || ''
            const cat = c.category || ''
            if (matchers.pivo(name, cat)) { totalBeers += qty; eventBeers += qty }
            if (matchers.redbull(name, cat)) totalRedbull += qty
            if (matchers.bueno(name, cat)) totalBueno += qty
            if (matchers.jagermeister(name, cat)) totalJager += qty
        }
        if (eventBeers > maxBeersInEvent) maxBeersInEvent = eventBeers
        if (eventItems > maxItemsInEvent) maxItemsInEvent = eventItems

        const nights = e.nights_count || 0
        totalNights += nights
        if (nights > maxNightsInEvent) maxNightsInEvent = nights

        const total = e.grandTotal || 0
        totalSpent += total
        if (total > maxSpendingInEvent) maxSpendingInEvent = total

        totalTip += e.tip || 0

        const votes = e.gameVoteCount || 0
        if (votes > maxGameVotesInEvent) maxGameVotesInEvent = votes

        if (e.registrationOrder === 1) wasFirstRegistered = true
    }

    return {
        eventCount: events.length,
        totalNights,
        maxNightsInEvent,
        totalSpent,
        maxSpendingInEvent,
        totalBeers,
        maxBeersInEvent,
        totalRedbull,
        totalBueno,
        totalJager,
        totalTip,
        maxItemsInEvent,
        maxGameVotesInEvent,
        wasFirstRegistered,
    }
}
