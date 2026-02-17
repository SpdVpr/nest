'use client'

export default function NestLoading({ message = 'Načítám...' }: { message?: string }) {
    return (
        <div className="min-h-screen bg-[var(--nest-dark)] flex items-center justify-center">
            <div className="text-center">
                <div className="nest-spinner mx-auto mb-4" />
                <p className="text-[var(--nest-white-60)] text-sm">{message}</p>
            </div>
        </div>
    )
}
