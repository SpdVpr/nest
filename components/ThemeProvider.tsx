'use client'

import { useEffect } from 'react'
import ThemePanel from './ThemePanel'

const THEME_KEYS = [
    '--nest-bg',
    '--nest-surface',
    '--nest-surface-alt',
    '--nest-border',
    '--nest-border-light',
    '--nest-text-primary',
    '--nest-text-secondary',
    '--nest-text-tertiary',
    '--nest-yellow',
    '--nest-yellow-dark',
]

export default function ThemeProvider() {
    useEffect(() => {
        try {
            const saved = localStorage.getItem('nest-theme')
            if (saved) {
                const colors = JSON.parse(saved)
                THEME_KEYS.forEach(key => {
                    if (colors[key]) {
                        document.documentElement.style.setProperty(key, colors[key])
                    }
                })
            }
        } catch {
            // clear corrupted data
            localStorage.removeItem('nest-theme')
        }
    }, [])

    return <ThemePanel />
}
