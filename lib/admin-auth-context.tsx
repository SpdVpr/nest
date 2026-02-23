'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase/client'
import { AdminUser, AdminRole } from '@/lib/admin-roles'

interface AdminAuthContextType {
    user: User | null
    adminUser: AdminUser | null
    role: AdminRole | null
    loading: boolean
    isAdmin: boolean
    isMasterBrigadnik: boolean
    isBrigadnik: boolean
    isApproved: boolean
    isLegacyAuth: boolean
    logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType>({
    user: null,
    adminUser: null,
    role: null,
    loading: true,
    isAdmin: false,
    isMasterBrigadnik: false,
    isBrigadnik: false,
    isApproved: false,
    isLegacyAuth: false,
    logout: async () => { },
})

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [isLegacyAuth, setIsLegacyAuth] = useState(false)

    const fetchAdminUser = useCallback(async (firebaseUser: User) => {
        try {
            const token = await firebaseUser.getIdToken()
            const res = await fetch('/api/admin/me', {
                headers: { 'Authorization': `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setAdminUser(data.user)
            } else {
                setAdminUser(null)
            }
        } catch (error) {
            console.error('Failed to fetch admin user:', error)
            setAdminUser(null)
        }
    }, [])

    useEffect(() => {
        const auth = getFirebaseAuth()
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                await fetchAdminUser(firebaseUser)
                setIsLegacyAuth(false)
            } else {
                setAdminUser(null)
                // Check for legacy admin_token
                const legacyToken = localStorage.getItem('admin_token')
                if (legacyToken) {
                    setIsLegacyAuth(true)
                    // Legacy admin user has full admin access
                    setAdminUser({
                        uid: 'legacy',
                        email: 'admin@local',
                        name: 'Admin (heslo)',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                        approved: true,
                    })
                }
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [fetchAdminUser])

    const logout = useCallback(async () => {
        const auth = getFirebaseAuth()
        await signOut(auth)
        localStorage.removeItem('admin_token')
        setAdminUser(null)
        setIsLegacyAuth(false)
    }, [])

    const role = adminUser?.role || null
    const isApproved = adminUser?.approved || false

    return (
        <AdminAuthContext.Provider
            value={{
                user,
                adminUser,
                role,
                loading,
                isAdmin: role === 'admin',
                isMasterBrigadnik: role === 'master_brigadnik',
                isBrigadnik: role === 'brigadnik',
                isApproved,
                isLegacyAuth,
                logout,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    )
}

export function useAdminAuth() {
    return useContext(AdminAuthContext)
}
