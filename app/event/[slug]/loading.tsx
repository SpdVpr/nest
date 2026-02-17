'use client'

export default function EventLoading() {
    return (
        <div className="min-h-screen bg-[var(--nest-dark)] text-[var(--nest-white)] p-4">
            <div className="max-w-3xl mx-auto py-6">
                {/* Skeleton header */}
                <div className="h-5 w-28 bg-[var(--nest-dark-3)] rounded-lg mb-6 animate-pulse" />

                <div className="nest-card-elevated p-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--nest-dark-3)] rounded-lg animate-pulse" />
                        <div className="flex-1">
                            <div className="h-6 w-40 bg-[var(--nest-dark-3)] rounded-lg animate-pulse mb-2" />
                            <div className="h-3 w-28 bg-[var(--nest-dark-4)] rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Skeleton cards */}
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="nest-card p-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[var(--nest-dark-3)]" />
                                <div className="flex-1">
                                    <div className="h-4 w-28 bg-[var(--nest-dark-3)] rounded mb-2" />
                                    <div className="h-3 w-40 bg-[var(--nest-dark-4)] rounded" />
                                </div>
                                <div className="h-5 w-14 bg-[var(--nest-dark-3)] rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
