import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
  try {
    let session = null
    
    // Thử lấy session từ cookies
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
    } catch (cookieError: any) {
      // Fallback: Thử từ Authorization header
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '').replace('bearer ', '').trim()
        if (token && token.length > 10) {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } }
            }
          )
          const result = await supabase.auth.getUser()
          if (result.data.user && !result.error) {
            session = {
              user: result.data.user,
              access_token: token,
            } as any
          }
        }
      }
    }
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 })
    }

    // Kiểm tra quyền admin
    const { data: currentProfile } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!currentProfile || (currentProfile as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Lấy userId từ query params
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Không cho xóa chính mình
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Bạn không thể xóa chính mình' }, { status: 400 })
    }

    // Lấy role của target user
    const { data: targetProfile } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 })
    }

    const currentRole = (currentProfile as any).role
    const targetRole = (targetProfile as any).role

    // Quy tắc: chỉ được xóa user có quyền thấp hơn
    const roleLevels: Record<string, number> = {
      admin: 3,
      editor: 2,
      user: 1
    }

    const currentLevel = roleLevels[currentRole] || 0
    const targetLevel = roleLevels[targetRole] || 0

    if (currentLevel <= targetLevel) {
      const roleNames: Record<string, string> = {
        admin: 'Quản trị viên',
        editor: 'Biên tập viên',
        user: 'Người dùng'
      }
      return NextResponse.json(
        { error: `Bạn không thể xóa user có quyền ${roleNames[targetRole] || targetRole}. Chỉ có thể xóa user có quyền thấp hơn.` },
        { status: 403 }
      )
    }

    // Xóa user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: `Không thể xóa user: ${deleteError.message}` }, { status: 500 })
    }

    // Log delete action
    try {
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      const clientUserAgent = request.headers.get('user-agent') || 'unknown'

      await supabaseAdmin.rpc('log_user_activity', {
        p_user_id: session.user.id,
        p_activity_type: 'admin_action',
        p_action: 'delete_user',
        p_details: {
          deleted_user_id: targetUserId,
          deleted_user_role: targetRole
        },
        p_ip_address: clientIP,
        p_user_agent: clientUserAgent,
        p_risk_level: 'high' // Delete user là hành động nguy hiểm
      } as any)
    } catch (logError) {
      console.error('Failed to log delete user activity:', logError)
      // Không throw - logging không nên làm gián đoạn flow chính
    }

    return NextResponse.json({ success: true, message: 'Đã xóa user thành công' })
  } catch (error: any) {
    console.error('Error in delete-user route:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

