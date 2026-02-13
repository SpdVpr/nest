'use client'

export default function EventLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
            <div className="max-w-3xl mx-auto py-6">
                {/* Skeleton header */}
                <div className="h-6 w-32 bg-gray-200 rounded-lg mb-6 animate-pulse" />

                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex-1">
                            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
                            <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Skeleton cards */}
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200" />
                                <div className="flex-1">
                                    <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
                                    <div className="h-3 w-48 bg-gray-100 rounded" />
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
