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


    useEffect(() => {
        const auth = getFirebaseAuth()
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            let foundAdmin = false

            if (firebaseUser) {
                // Try to fetch admin user from Firestore
                try {
                    const token = await firebaseUser.getIdToken()
                    const res = await fetch('/api/admin/me', {
                        headers: { 'Authorization': `Bearer ${token}` },
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setAdminUser(data.user)
                        setIsLegacyAuth(false)
                        foundAdmin = true
                    }
                } catch (error) {
                    console.error('Failed to fetch admin user:', error)
                }
            }

            // If no admin found via Firebase Auth, check legacy token
            if (!foundAdmin) {
                const legacyToken = localStorage.getItem('admin_token')
                if (legacyToken) {
                    setIsLegacyAuth(true)
                    setAdminUser({
                        uid: 'legacy',
                        email: 'admin@local',
                        name: 'Admin (heslo)',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                        approved: true,
                    })
                } else if (!firebaseUser) {
                    setAdminUser(null)
                    setIsLegacyAuth(false)
                } else {
                    // Firebase user exists but is not an admin — clear admin state
                    setAdminUser(null)
                    setIsLegacyAuth(false)
                }
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

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
