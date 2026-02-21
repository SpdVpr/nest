// Hardware System Types

export interface HardwareSpecs {
  // Monitor specs
  resolution?: string
  diagonal?: string
  hz?: string

  // PC specs
  cpu?: string
  ram?: string
  gpu?: string
}

export interface HardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity: number           // how many physical units of this model
  specs?: HardwareSpecs
  is_available: boolean
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface HardwareReservation {
  id: string
  hardware_item_id: string
  guest_id: string
  session_id: string
  quantity: number
  nights_count: number
  total_price: number
  status: 'active' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string

  // Relations
  hardware_items?: HardwareItem
  guests?: {
    id: string
    name: string
  }
}