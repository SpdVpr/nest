// TypeScript types for Supabase database schema

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          name: string
          slug: string
          start_date: string
          end_date: string | null
          is_active: boolean
          status: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          status?: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          status?: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
          description?: string | null
          created_at?: string
        }
      }
      session_stock: {
        Row: {
          id: string
          session_id: string
          product_id: string
          initial_quantity: number
          consumed_quantity: number
          remaining_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          product_id: string
          initial_quantity?: number
          consumed_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          product_id?: string
          initial_quantity?: number
          consumed_quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      guests: {
        Row: {
          id: string
          name: string
          session_id: string
          nights_count: number
          check_in_date: string | null
          check_out_date: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          session_id: string
          nights_count?: number
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          session_id?: string
          nights_count?: number
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          is_active?: boolean
        }
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          purchase_price: number | null
          category: string | null
          image_url: string | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          purchase_price?: number | null
          category?: string | null
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          purchase_price?: number | null
          category?: string | null
          image_url?: string | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      consumption: {
        Row: {
          id: string
          guest_id: string
          product_id: string
          quantity: number
          session_id: string
          consumed_at: string
        }
        Insert: {
          id?: string
          guest_id: string
          product_id: string
          quantity?: number
          session_id: string
          consumed_at?: string
        }
        Update: {
          id?: string
          guest_id?: string
          product_id?: string
          quantity?: number
          session_id?: string
          consumed_at?: string
        }
      }
      hardware_items: {
        Row: {
          id: string
          name: string
          type: 'monitor' | 'pc'
          category: string
          price_per_night: number
          specs: any
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'monitor' | 'pc'
          category: string
          price_per_night: number
          specs?: any
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'monitor' | 'pc'
          category?: string
          price_per_night?: number
          specs?: any
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hardware_reservations: {
        Row: {
          id: string
          hardware_item_id: string
          guest_id: string
          session_id: string
          nights_count: number
          total_price: number
          status: 'active' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hardware_item_id: string
          guest_id: string
          session_id: string
          nights_count?: number
          total_price: number
          status?: 'active' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hardware_item_id?: string
          guest_id?: string
          session_id?: string
          nights_count?: number
          total_price?: number
          status?: 'active' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper types
export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionStock = Database['public']['Tables']['session_stock']['Row']
export type Guest = Database['public']['Tables']['guests']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Consumption = Database['public']['Tables']['consumption']['Row']
export type HardwareItem = Database['public']['Tables']['hardware_items']['Row']
export type HardwareReservation = Database['public']['Tables']['hardware_reservations']['Row']

export type InsertSession = Database['public']['Tables']['sessions']['Insert']
export type InsertSessionStock = Database['public']['Tables']['session_stock']['Insert']
export type InsertGuest = Database['public']['Tables']['guests']['Insert']
export type InsertProduct = Database['public']['Tables']['products']['Insert']
export type InsertConsumption = Database['public']['Tables']['consumption']['Insert']
export type InsertHardwareItem = Database['public']['Tables']['hardware_items']['Insert']
export type InsertHardwareReservation = Database['public']['Tables']['hardware_reservations']['Insert']