export const ROUNDING_LABEL = 'Zaokrouhleno'

interface SettlementAdjustment {
    label?: string
    amount?: number
}

export function getRoundingTipFromAdjustments(adjustments: SettlementAdjustment[] | undefined | null): number {
    return (adjustments || [])
        .filter(adj => adj.label === ROUNDING_LABEL)
        .reduce((sum, adj) => sum + Math.max(0, adj.amount || 0), 0)
}
