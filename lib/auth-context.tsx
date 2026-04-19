'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { usePathname } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase/client'
import { UserProfile, Guest } from '@/types/database.types'
import { guestStorage, StoredGuest, GUEST_STORAGE_EVENT } from '@/lib/guest-storage'

export type ClaimedGuest = Guest & { session_slug: string }

interface GuestAuthContextType {
    firebaseUser: User | null
    userProfile: UserProfile | null
    claimedGuests: ClaimedGuest[]
    loading: boolean
    isAuthenticated: boolean
    logout: () => Promise<void>
    refreshProfile: () => Promise<void>
    getClaimedGuestForSession: (sessionId: string) => ClaimedGuest | null
    getClaimedGuestBySlug: (slug: string) => ClaimedGuest | null
}

const GuestAuthContext = createContext<GuestAuthContextType>({
    firebaseUser: null,
    userProfile: null,
    claimedGuests: [],
    loading: true,
    isAuthenticated: false,
    logout: async () => { },
    refreshProfile: async () => { },
    getClaimedGuestForSession: () => null,
    getClaimedGuestBySlug: () => null,
})

export function GuestAuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [claimedGuests, setClaimedGuests] = useState<ClaimedGuest[]>([])
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()

    const fetchProfile = useCallback(async (user: User) => {
        try {
            const token = await user.getIdToken()
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setUserProfile(data.user)
                setClaimedGuests(data.guests || [])
            } else if (res.status === 404) {
                // User exists in Firebase Auth but not in our users collection yet
                setUserProfile(null)
                setClaimedGuests([])
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error)
            setUserProfile(null)
            setClaimedGuests([])
        }
    }, [])

    useEffect(() => {
        const auth = getFirebaseAuth()
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user)
            if (user) {
                await fetchProfile(user)
            } else {
                setUserProfile(null)
                setClaimedGuests([])
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [fetchProfile])

    // Auto-hydrate guestStorage whenever the pathname matches an event slug the
    // user has a claimed guest for. This makes cross-device login work: any page
    // that reads guestStorage.getCurrentGuest(slug) will see the right guest
    // even if localStorage was empty before sign-in.
    useEffect(() => {
        if (!pathname) return
        const match = pathname.match(/^\/event\/([^\/?#]+)/)
        if (!match) return
        const slug = decodeURIComponent(match[1])
        const claimed = claimedGuests.find(g => g.session_slug === slug)
        if (!claimed) return
        const existing = guestStorage.getCurrentGuest(slug)
        if (!existing || existing.id !== claimed.id) {
            guestStorage.setCurrentGuest({
                id: claimed.id,
                name: claimed.name,
                session_slug: slug,
            })
        }
    }, [pathname, claimedGuests])

    const logout = useCallback(async () => {
        const auth = getFirebaseAuth()
        await signOut(auth)
        setUserProfile(null)
        setClaimedGuests([])
    }, [])

    const refreshProfile = useCallback(async () => {
        const user = firebaseUser || getFirebaseAuth().currentUser
        if (user) {
            setFirebaseUser(user)
            await fetchProfile(user)
        }
    }, [firebaseUser, fetchProfile])

    const getClaimedGuestForSession = useCallback((sessionId: string): ClaimedGuest | null => {
        return claimedGuests.find(g => g.session_id === sessionId) || null
    }, [claimedGuests])

    const getClaimedGuestBySlug = useCallback((slug: string): ClaimedGuest | null => {
        return claimedGuests.find(g => g.session_slug === slug) || null
    }, [claimedGuests])

    return (
        <GuestAuthContext.Provider
            value={{
                firebaseUser,
                userProfile,
                claimedGuests,
                loading,
                isAuthenticated: !!userProfile,
                logout,
                refreshProfile,
                getClaimedGuestForSession,
                getClaimedGuestBySlug,
            }}
        >
            {children}
        </GuestAuthContext.Provider>
    )
}

export function useGuestAuth() {
    return useContext(GuestAuthContext)
}

/**
 * Reactive accessor for the current guest on an event page.
 * Combines the authenticated user's claimed guest (if any) with any
 * guest previously stored in localStorage. Re-renders when either
 * source changes. Also keeps localStorage in sync so code that still
 * reads guestStorage directly picks up the value.
 */
export function useCurrentGuest(slug: string | null | undefined): StoredGuest | null {
    const { claimedGuests } = useGuestAuth()
    const [guest, setGuest] = useState<StoredGuest | null>(() => {
        if (!slug || typeof window === 'undefined') return null
        return guestStorage.getCurrentGuest(slug)
    })

    // Sync whenever slug changes or claimedGuests load/update
    useEffect(() => {
        if (!slug) {
            setGuest(null)
            return
        }
        const claimed = claimedGuests.find(g => g.session_slug === slug)
        if (claimed) {
            const next: StoredGuest = {
                id: claimed.id,
                name: claimed.name,
                session_slug: slug,
            }
            const existing = guestStorage.getCurrentGuest(slug)
            if (!existing || existing.id !== next.id) {
                guestStorage.setCurrentGuest(next)
            }
            setGuest(next)
        } else {
            setGuest(guestStorage.getCurrentGuest(slug))
        }
    }, [slug, claimedGuests])

    // Pick up changes to localStorage — both same-tab (custom event) and
    // cross-tab (browser 'storage' event).
    useEffect(() => {
        if (!slug || typeof window === 'undefined') return
        const refresh = () => setGuest(guestStorage.getCurrentGuest(slug))
        const onStorage = (e: StorageEvent) => {
            if (e.key && e.key !== 'current_guest') return
            refresh()
        }
        window.addEventListener('storage', onStorage)
        window.addEventListener(GUEST_STORAGE_EVENT, refresh)
        return () => {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener(GUEST_STORAGE_EVENT, refresh)
        }
    }, [slug])

    return guest
}
