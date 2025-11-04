import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    let session = null
    let sessionError = null
    
    // Thử lấy session từ cookies trước
    try {
      const cookieStore = await cookies()
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name: string, options: any) {
              cookieStore.set({ name, value: '', ...options })
            },
          },
        }
      )

      const result = await supabase.auth.getSession()
      session = result.data.session
      sessionError = result.error
    } catch (cookieError: any) {
      console.log('Cookie session failed, trying Authorization header...', cookieError?.message)
    }
    
    // Fallback: Thử từ Authorization header nếu cookies không có session
    if (!session) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      console.log('No session from cookies. Checking Authorization header...', {
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader?.length || 0,
        allHeaders: Object.fromEntries(request.headers.entries())
      })
      
      if (authHeader) {
        console.log('Trying Authorization header...')
        const token = authHeader.replace('Bearer ', '').replace('bearer ', '').trim()
        
        if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
          try {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                global: {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              }
            )
            
            const result = await supabase.auth.getUser()
            if (result.data.user && !result.error) {
              console.log('✅ Got user from Authorization header:', result.data.user.id)
              // Tạo session object từ user
              session = {
                user: result.data.user,
                access_token: token,
                refresh_token: '',
                expires_in: 3600,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                token_type: 'bearer'
              } as any
            } else {
              console.log('❌ Authorization header failed:', result.error?.message)
            }
          } catch (tokenError: any) {
            console.log('❌ Token error:', tokenError.message)
          }
        } else {
          console.log('❌ Invalid token in Authorization header (too short or null)')
        }
      } else {
        console.log('❌ No Authorization header found in request')
      }
    }
    
    // Log để debug (chỉ trong dev)
    if (process.env.NODE_ENV === 'development') {
      console.log('Session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        sessionError: sessionError?.message,
        userId: session?.user?.id
      })
    }
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: `Authentication error: ${sessionError.message}` },
        { status: 401 }
      )
    }
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first. Session expired or not found.' },
        { status: 401 }
      )
    }

    const user = session.user

    // Kiểm tra quyền admin - dùng supabaseAdmin để bypass RLS
    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || (profile as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { userId, role, fullName } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and role' },
        { status: 400 }
      )
    }

    if (!['admin', 'editor', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin", "editor", or "user"' },
        { status: 400 }
      )
    }

    // Update profile using admin client
    const { data, error } = await (supabaseAdmin as any)
      .from('profiles')
      .update({
        role,
        full_name: fullName || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      
      // Kiểm tra nếu lỗi do constraint (role không hợp lệ)
      if (error.code === '23514' || error.message.includes('check constraint') || error.message.includes('role')) {
        return NextResponse.json(
          { 
            error: `Lỗi: Role '${role}' không được hỗ trợ. Vui lòng chạy SQL migration để thêm role 'editor'. Xem file: database/add-editor-role-recommended.sql`,
            code: 'ROLE_NOT_SUPPORTED',
            details: error.message
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: error.message || 'Không thể cập nhật profile',
          code: error.code,
          details: error.details || error.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: data
    })

  } catch (error: any) {
    console.error('Error in update-profile route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

