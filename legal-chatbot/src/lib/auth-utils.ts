import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function getServerSession() {
  const supabase = await createSupabaseServerClient()
  try {
    // Dùng getUser() thay vì getSession() để ổn định hơn
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Nếu có lỗi về refresh token, bỏ qua và trả về null
    if (error && (error.message.includes('Refresh Token') || error.message.includes('refresh_token'))) {
      console.warn('Invalid refresh token in getServerSession, returning null:', error.message)
      return null
    }
    
    if (!user) {
      return null
    }

    // Lấy session để có đầy đủ thông tin
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error: any) {
    // Bỏ qua lỗi refresh token, trả về null
    if (error?.message?.includes('Refresh Token') || error?.message?.includes('refresh_token')) {
      console.warn('Refresh token error in getServerSession, returning null:', error.message)
      return null
    }
    // Re-throw nếu không phải lỗi refresh token
    throw error
  }
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    throw new Error('Unauthorized - Please login first')
  }
  return { session }
}

export async function requireAdmin() {
  const { session } = await requireAuth()
  const supabase = await createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden - Admin access required')
  }
  
  return { session, profile }
}

export async function requireEditor() {
  const { session } = await requireAuth()
  const supabase = await createSupabaseServerClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
    throw new Error('Forbidden - Editor or Admin access required')
  }
  
  return { session, profile }
}

export async function requireAdminOrEditor() {
  return requireEditor()
}