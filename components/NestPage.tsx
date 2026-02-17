'use client'

import NestNav from '@/components/NestNav'

interface NestPageProps {
    children: React.ReactNode
    sessionSlug?: string
    backHref?: string
    title?: string
    onLogout?: () => void
    /** Extra classes for the content container */
    className?: string
    /** Max width class, defaults to max-w-4xl */
    maxWidth?: string
}

/**
 * Consistent page shell used by every page in the app.
 * Provides the dark background, NestNav, and a centered content area.
 */
export default function NestPage({
    children,
    sessionSlug,
    backHref,
    title,
    onLogout,
    className = '',
    maxWidth = 'max-w-4xl',
}: NestPageProps) {
    return (
        <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)]">
            <NestNav
                sessionSlug={sessionSlug}
                backHref={backHref}
                title={title}
                onLogout={onLogout}
            />
            <main className={`${maxWidth} mx-auto px-4 py-6 ${className}`}>
                {children}
            </main>
        </div>
    )
}
