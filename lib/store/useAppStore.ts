import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AppState {
  user: User | null
  isAuthenticated: boolean
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  theme: 'dark',
  sidebarOpen: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setTheme: (theme) => {
    set({ theme })
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  },

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}))
