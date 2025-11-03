'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Nếu có lỗi về refresh token, clear session
        if (error && (error.message.includes('Refresh Token') || error.message.includes('JWT'))) {
          console.warn('Invalid session, clearing...', error.message)
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (error: any) {
        console.error('Error getting session:', error)
        // Nếu lỗi về token, clear session
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('JWT')) {
          await supabase.auth.signOut()
        }
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Bỏ qua lỗi refresh token trong event listener
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed, sign out user
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        
        // Nếu profile chưa tồn tại, tự động tạo profile mới
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          const { data: userData } = await supabase.auth.getUser()
          if (userData?.user) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                full_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'User',
                role: 'user'
              })
              .select()
              .single()

            if (!createError && newProfile) {
              setProfile(newProfile)
              return
            }
          }
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
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
