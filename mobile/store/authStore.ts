import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: string
  email: string
  role: 'CLIENT' | 'PROVIDER'
  firstName: string
  lastName: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: async (user, token) => {
        await AsyncStorage.setItem('token', token)
        await AsyncStorage.setItem('user', JSON.stringify(user))
        set({ user, token, isAuthenticated: true })
      },
      logout: async () => {
        await AsyncStorage.removeItem('token')
        await AsyncStorage.removeItem('user')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)


