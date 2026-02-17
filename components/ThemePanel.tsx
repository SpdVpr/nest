'use client'

import { useState, useEffect } from 'react'
import { Settings, X, Copy, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface ThemeVar {
    key: string
    label: string
    defaultValue: string
}

const THEME_VARS: ThemeVar[] = [
    { key: '--nest-bg', label: 'Pozadí stránky', defaultValue: '#222831' },
    { key: '--nest-surface', label: 'Karty / sekce', defaultValue: '#393E46' },
    { key: '--nest-surface-alt', label: 'Alt. povrch (hover)', defaultValue: '#42474f' },
    { key: '--nest-border', label: 'Bordery', defaultValue: '#4a4f58' },
    { key: '--nest-border-light', label: 'Bordery (světlé)', defaultValue: '#555b65' },
    { key: '--nest-text-primary', label: 'Text hlavní', defaultValue: '#EEEEEE' },
    { key: '--nest-text-secondary', label: 'Text vedlejší', defaultValue: '#b0b0b0' },
    { key: '--nest-text-tertiary', label: 'Text tlumený', defaultValue: '#7a7a7a' },
    { key: '--nest-yellow', label: 'Accent (žlutá)', defaultValue: '#FFD369' },
    { key: '--nest-yellow-dark', label: 'Accent tmavší', defaultValue: '#e6b84d' },
]

const PRESETS: Record<string, Record<string, string>> = {
    'The Nest (default)': {
        '--nest-bg': '#222831',
        '--nest-surface': '#393E46',
        '--nest-surface-alt': '#42474f',
        '--nest-border': '#4a4f58',
        '--nest-border-light': '#555b65',
        '--nest-text-primary': '#EEEEEE',
        '--nest-text-secondary': '#b0b0b0',
        '--nest-text-tertiary': '#7a7a7a',
        '--nest-yellow': '#FFD369',
        '--nest-yellow-dark': '#e6b84d',
    },
    'Pure Dark': {
        '--nest-bg': '#0a0a0a',
        '--nest-surface': '#141414',
        '--nest-surface-alt': '#1e1e1e',
        '--nest-border': '#2a2a2a',
        '--nest-border-light': '#333333',
        '--nest-text-primary': '#ffffff',
        '--nest-text-secondary': '#a0a0a0',
        '--nest-text-tertiary': '#666666',
        '--nest-yellow': '#FFD369',
        '--nest-yellow-dark': '#e6b84d',
    },
    'Warm Dark': {
        '--nest-bg': '#1c1917',
        '--nest-surface': '#292524',
        '--nest-surface-alt': '#33302e',
        '--nest-border': '#44403c',
        '--nest-border-light': '#57534e',
        '--nest-text-primary': '#fafaf9',
        '--nest-text-secondary': '#a8a29e',
        '--nest-text-tertiary': '#78716c',
        '--nest-yellow': '#FFD369',
        '--nest-yellow-dark': '#e6b84d',
    },
    'Midnight Blue': {
        '--nest-bg': '#0f172a',
        '--nest-surface': '#1e293b',
        '--nest-surface-alt': '#27364b',
        '--nest-border': '#334155',
        '--nest-border-light': '#475569',
        '--nest-text-primary': '#f1f5f9',
        '--nest-text-secondary': '#94a3b8',
        '--nest-text-tertiary': '#64748b',
        '--nest-yellow': '#FFD369',
        '--nest-yellow-dark': '#e6b84d',
    },
}

export default function ThemePanel() {
    const [isOpen, setIsOpen] = useState(false)
    const [colors, setColors] = useState<Record<string, string>>({})
    const [showExport, setShowExport] = useState(false)
    const [copied, setCopied] = useState(false)

    // Load saved theme or defaults
    useEffect(() => {
        const saved = localStorage.getItem('nest-theme')
        const initial: Record<string, string> = {}
        THEME_VARS.forEach(v => {
            const savedVal = saved ? JSON.parse(saved)[v.key] : null
            initial[v.key] = savedVal || v.defaultValue
        })
        setColors(initial)
        // Apply to DOM
        Object.entries(initial).forEach(([key, val]) => {
            document.documentElement.style.setProperty(key, val)
        })
    }, [])

    const updateColor = (key: string, value: string) => {
        setColors(prev => {
            const next = { ...prev, [key]: value }
            localStorage.setItem('nest-theme', JSON.stringify(next))
            return next
        })
        document.documentElement.style.setProperty(key, value)
    }

    const applyPreset = (preset: Record<string, string>) => {
        Object.entries(preset).forEach(([key, val]) => {
            updateColor(key, val)
        })
    }

    const resetToDefaults = () => {
        THEME_VARS.forEach(v => updateColor(v.key, v.defaultValue))
    }

    const exportCSS = () => {
        const lines = THEME_VARS.map(v =>
            `  ${v.key}: ${colors[v.key] || v.defaultValue};  /* ${v.label} */`
        )
        return `/* === THEME CONTROL === */\n${lines.join('\n')}`
    }

    const copyExport = () => {
        navigator.clipboard.writeText(exportCSS())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-full bg-[var(--nest-yellow)] text-[#1a1a1a] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                title="Theme Panel"
            >
                {isOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 z-[9998] w-80 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl"
                    style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f0f0f0' }}
                >
                    {/* Header */}
                    <div className="sticky top-0 px-4 py-3 border-b border-[#333] flex items-center justify-between"
                        style={{ background: '#1a1a1a' }}
                    >
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            🎨 Theme Control
                        </h3>
                        <button onClick={resetToDefaults} className="text-xs px-2 py-1 rounded-lg hover:bg-[#333] transition-colors flex items-center gap-1" style={{ color: '#999' }}>
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="px-4 py-3 border-b border-[#333]">
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#666' }}>Předvolby</p>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(PRESETS).map(([name, preset]) => (
                                <button
                                    key={name}
                                    onClick={() => applyPreset(preset)}
                                    className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:opacity-90"
                                    style={{
                                        background: preset['--nest-surface'],
                                        color: preset['--nest-text-primary'],
                                        border: `1px solid ${preset['--nest-border']}`,
                                    }}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Pickers */}
                    <div className="px-4 py-2">
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#666' }}>Vlastní barvy</p>
                        {THEME_VARS.map(v => (
                            <div key={v.key} className="flex items-center gap-2 py-1.5">
                                <input
                                    type="color"
                                    value={colors[v.key] || v.defaultValue}
                                    onChange={(e) => updateColor(v.key, e.target.value)}
                                    className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                                    style={{ background: 'none' }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{v.label}</p>
                                    <p className="text-[10px] font-mono" style={{ color: '#666' }}>{colors[v.key] || v.defaultValue}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Export */}
                    <div className="px-4 py-3 border-t border-[#333]">
                        <button
                            onClick={() => setShowExport(!showExport)}
                            className="w-full text-xs flex items-center justify-between px-3 py-2 rounded-lg transition-colors"
                            style={{ background: '#252525', color: '#ccc' }}
                        >
                            <span>Exportovat CSS</span>
                            {showExport ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {showExport && (
                            <div className="mt-2">
                                <pre className="text-[10px] p-3 rounded-lg overflow-x-auto font-mono leading-relaxed"
                                    style={{ background: '#111', color: '#aaa' }}
                                >
                                    {exportCSS()}
                                </pre>
                                <button
                                    onClick={copyExport}
                                    className="mt-2 w-full text-xs py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
                                    style={{ background: '#facc15', color: '#1a1a1a' }}
                                >
                                    <Copy className="w-3 h-3" />
                                    {copied ? 'Zkopírováno!' : 'Kopírovat do schránky'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
