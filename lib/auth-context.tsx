'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase/client'
import { UserProfile, Guest } from '@/types/database.types'

interface GuestAuthContextType {
    firebaseUser: User | null
    userProfile: UserProfile | null
    claimedGuests: Guest[]
    loading: boolean
    isAuthenticated: boolean
    logout: () => Promise<void>
    refreshProfile: () => Promise<void>
    getClaimedGuestForSession: (sessionId: string) => Guest | null
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
})

export function GuestAuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [claimedGuests, setClaimedGuests] = useState<Guest[]>([])
    const [loading, setLoading] = useState(true)

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

    const logout = useCallback(async () => {
        const auth = getFirebaseAuth()
        await signOut(auth)
        setUserProfile(null)
        setClaimedGuests([])
    }, [])

    const refreshProfile = useCallback(async () => {
        if (firebaseUser) {
            await fetchProfile(firebaseUser)
        }
    }, [firebaseUser, fetchProfile])

    const getClaimedGuestForSession = useCallback((sessionId: string): Guest | null => {
        return claimedGuests.find(g => g.session_id === sessionId) || null
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
            }}
        >
            {children}
        </GuestAuthContext.Provider>
    )
}

export function useGuestAuth() {
    return useContext(GuestAuthContext)
}
