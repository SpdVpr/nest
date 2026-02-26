// TypeScript types for Firebase Firestore

// =============================================
// SESSION TYPES
// =============================================

export interface HardwareOverride {
  quantity: number  // overridden quantity for this session (can be 0 to disable entirely)
}

export interface Session {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string | null
  start_time?: string | null  // Format: "HH:MM" (e.g., "18:00")
  end_time?: string | null    // Format: "HH:MM" (e.g., "22:00")
  price_per_night: number
  surcharge_enabled?: boolean  // if true, price increases by 150 Kč per missing guest below 10 (default false)
  is_active: boolean
  menu_enabled?: boolean
  hardware_pricing_enabled?: boolean  // if false, HW prices are hidden from guests (default true)
  hardware_enabled?: boolean   // if false, hardware reservation section is completely hidden (default true)
  seats_enabled?: boolean      // if false, seat reservation section is completely hidden (default true)
  hardware_overrides?: Record<string, HardwareOverride>  // per-item quantity overrides for this session
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
  dietary_restrictions?: string[]  // ['vegan', 'vegetarian', 'gluten-free', 'lactose-free']
  dietary_note?: string | null     // free text for custom allergies
  deposit?: number             // amount of deposit already paid (Kč)
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
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity: number
  specs?: {
    resolution?: string
    diagonal?: string
    hz?: string
    cpu?: string
    ram?: string
    gpu?: string
  } | null
  is_available: boolean
  sort_order?: number
  created_at: string
  updated_at: string
}

export interface HardwareItemInput {
  name: string
  type: 'monitor' | 'pc' | 'accessory'
  category: string
  price_per_night: number
  quantity?: number
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

// =============================================
// MENU / MEAL TYPES
// =============================================

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export interface MenuItem {
  id: string
  session_id: string
  day_index: number        // 0-based day offset from start_date
  meal_type: MealType
  time: string             // "08:00"
  description: string      // what's being served
  order: number            // for sorting within same day
  created_at: string
}

export interface MenuItemInput {
  session_id: string
  day_index: number
  meal_type: MealType
  time: string
  description: string
  order?: number
}

export interface GuestMealSelection {
  id: string
  guest_id: string
  session_id: string
  first_meal_id: string | null   // first meal the guest will attend
  last_meal_id: string | null    // last meal the guest will attend
  created_at: string
  updated_at: string
}

// =============================================
// GAME LIBRARY TYPES (global database of games)
// =============================================

export interface GameLibraryItem {
  id: string
  name: string
  category?: string              // e.g. 'FPS', 'RTS', 'Racing', 'Sport', 'Party'
  max_players?: number | null
  image_url?: string | null
  notes?: string | null          // install size, requirements etc.
  is_available: boolean          // still offered for install?
  created_at: string
  updated_at: string
}

export interface GameLibraryItemInput {
  name: string
  category?: string
  max_players?: number | null
  image_url?: string | null
  notes?: string | null
  is_available?: boolean
}

// =============================================
// PER-EVENT GAMES TYPES
// =============================================

export interface Game {
  id: string
  session_id: string
  name: string
  library_game_id?: string       // optional link to GameLibraryItem
  suggested_by?: string          // guest_id if user-suggested, undefined if admin
  is_admin_pick: boolean         // true if added by admin
  votes: number                  // cached vote count
  created_at: string
}

export interface GameVote {
  id: string
  game_id: string
  guest_id: string
  session_id: string
  created_at: string
}