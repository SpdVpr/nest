// Přednastavené kategorie produktů
export const PRODUCT_CATEGORIES = [
  'Nápoje',
  'Pivo',
  'Energetické nápoje',
  'Snacky',
  'Sladkosti',
  'Pizza',
  'Jídlo',
  'Ostatní',
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]