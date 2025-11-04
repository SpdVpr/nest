export interface StoredGuest {
  id: string
  name: string
  session_slug: string
}

const GUEST_KEY = 'current_guest'

export const guestStorage = {
  setCurrentGuest: (guest: StoredGuest | null) => {
    if (typeof window === 'undefined') return
    
    if (guest) {
      localStorage.setItem(GUEST_KEY, JSON.stringify(guest))
    } else {
      localStorage.removeItem(GUEST_KEY)
    }
  },

  getCurrentGuest: (session_slug: string): StoredGuest | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(GUEST_KEY)
      if (!stored) return null
      
      const guest: StoredGuest = JSON.parse(stored)
      
      if (guest.session_slug === session_slug) {
        return guest
      }
      
      return null
    } catch (error) {
      console.error('Error reading guest from storage:', error)
      return null
    }
  },

  clearCurrentGuest: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(GUEST_KEY)
  }
}
