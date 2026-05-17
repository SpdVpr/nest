export const ROUNDING_LABEL = 'Zaokrouhleno'

interface SettlementAdjustment {
    label?: string
    amount?: number
}

interface SettlementCustomItem {
    label?: string
    amount?: number
}

function normalizeTipLabel(label: string | undefined): string {
    return (label || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
}

function isTipLabel(label: string | undefined): boolean {
    const normalized = normalizeTipLabel(label)
    return normalized === 'tip'
        || normalized.includes('dysko')
        || normalized.includes('dyzko')
        || normalized.includes('spropitne')
}

export function getRoundingTipFromAdjustments(adjustments: SettlementAdjustment[] | undefined | null): number {
    return (adjustments || [])
        .filter(adj => adj.label === ROUNDING_LABEL)
        .reduce((sum, adj) => sum + Math.max(0, adj.amount || 0), 0)
}

export function getTipFromCustomItems(customItems: SettlementCustomItem[] | undefined | null): number {
    return (customItems || [])
        .filter(item => isTipLabel(item.label))
        .reduce((sum, item) => sum + Math.max(0, item.amount || 0), 0)
}
