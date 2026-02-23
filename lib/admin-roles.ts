// Admin user roles
export type AdminRole = 'admin' | 'master_brigadnik' | 'brigadnik'

export interface AdminUser {
    uid: string
    email: string
    name: string
    role: AdminRole
    created_at: string
    approved: boolean
}

// Role permissions
export const ROLE_LABELS: Record<AdminRole, string> = {
    admin: 'Admin',
    master_brigadnik: 'Master Brigádník',
    brigadnik: 'Brigádník',
}

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
    admin: 'Plný přístup včetně financí a nastavení',
    master_brigadnik: 'Kompletní správa bez přístupu k financím a cenám',
    brigadnik: 'Čtení a pomoc s přípravou, bez financí a nastavení',
}

// Permission checks
export function canViewFinances(role: AdminRole): boolean {
    return role === 'admin'
}

export function canEditSettings(role: AdminRole): boolean {
    return role === 'admin' || role === 'master_brigadnik'
}

export function canEditPrices(role: AdminRole): boolean {
    return role === 'admin'
}

export function canManageUsers(role: AdminRole): boolean {
    return role === 'admin'
}

export function canCreateEvents(role: AdminRole): boolean {
    return role === 'admin' || role === 'master_brigadnik'
}

export function canDeleteEvents(role: AdminRole): boolean {
    return role === 'admin' || role === 'master_brigadnik'
}
