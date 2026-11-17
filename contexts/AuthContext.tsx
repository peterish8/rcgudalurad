'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, convex, errorMessage, getToken, setToken } from '@/lib/convex'

interface AdminUser {
  email: string
}

interface AuthContextType {
  user: AdminUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Restore the session saved in localStorage, if it is still valid.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    convex
      .query(api.auth.me, { token })
      .then((me: AdminUser | null) => {
        if (me) setUser(me)
        else setToken(null)
      })
      .catch((err) => console.error('Session check failed:', err))
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const result: { token: string; email: string } = await convex.mutation(api.auth.login, { email, password })
      setToken(result.token)
      setUser({ email: result.email })
    } catch (err) {
      throw new Error(errorMessage(err, 'Failed to login. Please check your credentials.'))
    }
  }

  const signOut = async () => {
    const token = getToken()
    if (token) await convex.mutation(api.auth.logout, { token }).catch(() => {})
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
