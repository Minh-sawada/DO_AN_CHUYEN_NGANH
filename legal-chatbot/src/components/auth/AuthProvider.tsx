'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const fetchingProfileRef = useRef<string | null>(null) // Tránh fetch profile nhiều lần
  const hasLoggedLoginRef = useRef<boolean>(false) // Track xem đã log login trong session này chưa
  const isInitialLoadRef = useRef<boolean>(true) // Track xem có phải initial load không

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Nếu có lỗi về refresh token, clear session (không log error để tránh spam console)
        if (error && (error.message.includes('Refresh Token') || error.message.includes('refresh_token') || error.message.includes('JWT'))) {
          // Silently clear invalid session
          try {
            await supabase.auth.signOut()
          } catch (e) {
            // Ignore signOut errors
          }
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          isInitialLoadRef.current = false
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
          // Nếu đã có session từ initial load, đánh dấu để không log login khi onAuthStateChange trigger
          // Đợi một chút để đảm bảo onAuthStateChange đã được setup
          setTimeout(() => {
            isInitialLoadRef.current = false
          }, 500) // Tăng timeout để đảm bảo onAuthStateChange đã được setup
        } else {
          // Không có session, có thể log login khi user thực sự login
          isInitialLoadRef.current = false
        }
      } catch (error: any) {
        // Nếu lỗi về token, clear session (không log để tránh spam console)
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh_token') || error?.message?.includes('JWT')) {
          try {
            await supabase.auth.signOut()
          } catch (e) {
            // Ignore signOut errors
          }
          setSession(null)
          setUser(null)
          setProfile(null)
        } else {
          // Chỉ log lỗi khác
          console.error('Error getting session:', error)
        }
        isInitialLoadRef.current = false
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Helper function để log activity
    const logActivity = async (userId: string, activityType: 'login' | 'logout', action: string) => {
      try {
        console.log(`📝 Logging ${activityType} activity for user:`, userId)
        const response = await fetch('/api/system/log-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            activity_type: activityType,
            action: action,
            details: {
              timestamp: new Date().toISOString(),
              event: activityType
            },
            risk_level: 'low'
          })
        })

        // Handle plain text response (rate limit)
        const contentType = response.headers.get('content-type')
        let result: any
        
        if (contentType && contentType.includes('application/json')) {
          result = await response.json()
        } else {
          // Plain text response (e.g., "Rate limit exceeded")
          const text = await response.text()
          console.warn(`⚠️ Server returned plain text: ${text}`)
          result = { success: false, error: text || 'Unknown error' }
        }
        
        if (response.ok && result.success) {
          console.log(`✅ ${activityType} activity logged successfully:`, result.activity_id)
        } else {
          // Không log error nếu là rate limit để tránh spam console
          if (response.status !== 429) {
            console.error(`❌ Failed to log ${activityType} activity:`, result.error)
          } else {
            console.warn(`⚠️ Rate limit - skipping ${activityType} log`)
          }
        }
      } catch (error: any) {
        // Không log error nếu là rate limit để tránh spam console
        if (!error.message?.includes('Rate limit')) {
          console.error(`❌ Failed to log ${activityType} activity:`, error)
        }
        // Không throw - logging không nên làm gián đoạn flow chính
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'has session' : 'no session')
        
        // Xử lý PASSWORD_RECOVERY event
        if (event === 'PASSWORD_RECOVERY' && session) {
          console.log('Password recovery event detected')
          // Không redirect ở đây, để page.tsx xử lý
        }
        
        // Bỏ qua lỗi refresh token trong event listener
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed, sign out user
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          setProfile(null)
          fetchingProfileRef.current = null
          hasLoggedLoginRef.current = false
          setLoading(false)
          return
        }
        
        // Chỉ log login khi thực sự là login mới (không phải restore session)
        // Bỏ qua SIGNED_IN event nếu:
        // 1. Đang trong initial load (restore session)
        // 2. Đã log login trong session này rồi
        if (event === 'SIGNED_IN' && session?.user) {
          // Nếu là initial load, đây là restore session, không log
          if (isInitialLoadRef.current) {
            console.log('⏭️ Skipping login log - initial session restore')
            // Không log nhưng vẫn update state
          } else if (!hasLoggedLoginRef.current) {
            // Chỉ log nếu chưa log trong session này và không phải initial load
            console.log('User signed in, logging activity...')
            await logActivity(session.user.id, 'login', 'user_login')
            hasLoggedLoginRef.current = true
          } else {
            console.log('⏭️ Skipping login log - already logged in this session')
          }
        }
        
        // Reset login log flag khi sign out
        if (event === 'SIGNED_OUT') {
          hasLoggedLoginRef.current = false
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Chỉ fetch profile nếu chưa fetch hoặc user_id khác
          if (fetchingProfileRef.current !== session.user.id) {
            fetchingProfileRef.current = session.user.id
            await fetchProfile(session.user.id)
          }
        } else {
          setProfile(null)
          fetchingProfileRef.current = null
        }
        
        // Đánh dấu đã qua initial load sau lần đầu
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // Xóa dependency [user] để tránh vòng lặp vô hạn

  const fetchProfile = async (userId: string) => {
    // Tránh fetch nhiều lần cùng một user
    if (fetchingProfileRef.current === userId) {
      console.log('⏭️ Skipping fetch profile - already fetching:', userId)
      return
    }
    
    try {
      fetchingProfileRef.current = userId
      console.log('📥 Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error fetching profile:', error)
        
        // Nếu profile chưa tồn tại, tự động tạo profile mới
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          console.log('📝 Profile not found, creating new profile...')
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
              console.log('✅ Created new profile:', newProfile)
              setProfile(newProfile)
              fetchingProfileRef.current = null
              return
            }
          }
        }
        fetchingProfileRef.current = null
      } else {
        console.log('✅ Profile fetched successfully:', data)
        console.log('   Role:', data?.role)
        setProfile(data)
        fetchingProfileRef.current = null
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error)
      fetchingProfileRef.current = null
    }
  }

  const signOut = async () => {
    // Log logout activity trước khi sign out
    if (user?.id) {
      try {
        console.log('📝 Logging logout activity for user:', user.id)
        const response = await fetch('/api/system/log-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            activity_type: 'logout',
            action: 'user_logout',
            details: {
              timestamp: new Date().toISOString(),
              event: 'logout'
            },
            risk_level: 'low'
          })
        })

        // Handle plain text response (rate limit)
        const contentType = response.headers.get('content-type')
        let result: any
        
        if (contentType && contentType.includes('application/json')) {
          result = await response.json()
        } else {
          // Plain text response (e.g., "Rate limit exceeded")
          const text = await response.text()
          console.warn(`⚠️ Server returned plain text: ${text}`)
          result = { success: false, error: text || 'Unknown error' }
        }
        
        if (response.ok && result.success) {
          console.log('✅ Logout activity logged successfully:', result.activity_id)
        } else {
          // Không log error nếu là rate limit để tránh spam console
          if (response.status !== 429) {
            console.error('❌ Failed to log logout activity:', result.error)
          } else {
            console.warn('⚠️ Rate limit - skipping logout log')
          }
        }
      } catch (error: any) {
        // Không log error nếu là rate limit để tránh spam console
        if (!error.message?.includes('Rate limit')) {
          console.error('❌ Failed to log logout activity:', error)
        }
        // Không throw - logging không nên làm gián đoạn flow chính
      }
    } else {
      console.warn('⚠️ No user.id found, skipping logout logging')
    }
    
    // Reset login log flag
    hasLoggedLoginRef.current = false
    
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
