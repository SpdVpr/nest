// TypeScript types for Firebase Firestore

// =============================================
// SESSION TYPES
// =============================================

export interface Session {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string | null
  price_per_night: number
  is_active: boolean
  status?: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
  description?: string | null
  created_at: string
}

export interface SessionInput {
  name: string
  slug?: string
  start_date?: string
  end_date?: string | null
  price_per_night?: number
  is_active?: boolean
  status?: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
  description?: string | null
}

// =============================================
// SESSION STOCK TYPES
// =============================================

export interface SessionStock {
  id: string
  session_id: string
  product_id: string
  initial_quantity: number
  consumed_quantity: number
  remaining_quantity: number
  created_at: string
  updated_at: string
}

export interface SessionStockInput {
  session_id: string
  product_id: string
  initial_quantity?: number
  consumed_quantity?: number
}

// =============================================
// GUEST TYPES
// =============================================

export interface Guest {
  id: string
  name: string
  session_id: string
  nights_count: number
  check_in_date?: string | null
  check_out_date?: string | null
  is_active: boolean
  created_at: string
}

export interface GuestInput {
  name: string
  session_id: string
  nights_count?: number
  check_in_date?: string | null
  check_out_date?: string | null
  is_active?: boolean
}

// =============================================
// PRODUCT TYPES
// =============================================

export interface Product {
  id: string
  name: string
  price: number
  purchase_price?: number | null
  category: string | null
  image_url: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface ProductInput {
  name: string
  price: number
  purchase_price?: number | null
  category?: string | null
  image_url?: string | null
  is_available?: boolean
}

// =============================================
// CONSUMPTION TYPES
// =============================================

export interface Consumption {
  id: string
  guest_id: string
  product_id: string
  session_id: string
  quantity: number
  consumed_at: string
}

export interface ConsumptionInput {
  guest_id: string
  product_id: string
  session_id: string
  quantity?: number
}

// =============================================
// HARDWARE TYPES
// =============================================

export interface HardwareItem {
  id: string
  name: string
  type: 'monitor' | 'pc'
  category: string
  price_per_night: number
  specs?: {
    resolution?: string
    diagonal?: string
    hz?: string
    cpu?: string
    ram?: string
    gpu?: string
  } | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface HardwareItemInput {
  name: string
  type: 'monitor' | 'pc'
  category: string
  price_per_night: number
  specs?: {
    resolution?: string
    diagonal?: string
    hz?: string
    cpu?: string
    ram?: string
    gpu?: string
  } | null
  is_available?: boolean
}

export interface HardwareReservation {
  id: string
  hardware_item_id: string
  guest_id: string
  session_id: string
  nights_count: number
  total_price: number
  status: 'active' | 'completed' | 'cancelled'
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface HardwareReservationInput {
  hardware_item_id: string
  guest_id: string
  session_id: string
  nights_count?: number
  total_price: number
  status?: 'active' | 'completed' | 'cancelled'
  notes?: string | null
}

// =============================================
// SEAT RESERVATION TYPES
// =============================================

export interface SeatReservation {
  id: string
  seat_id: string
  guest_id: string
  session_id: string
  guest_name: string
  created_at: string
  updated_at: string
}

export interface SeatReservationInput {
  seat_id: string
  guest_id: string
  session_id: string
  guest_name: string
}

// =============================================
// LEGACY COMPATIBILITY (for easier migration)
// =============================================

export type InsertSession = SessionInput
export type InsertSessionStock = SessionStockInput
export type InsertGuest = GuestInput
export type InsertProduct = ProductInput
export type InsertConsumption = ConsumptionInput
export type InsertHardwareItem = HardwareItemInput
export type InsertHardwareReservation = HardwareReservationInput
export type InsertSeatReservation = SeatReservationInput