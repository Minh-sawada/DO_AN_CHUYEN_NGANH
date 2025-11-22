import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lấy userId từ query params (fallback nếu cookies không có)
    const { searchParams } = new URL(request.url)
    const clientUserId = searchParams.get('userId')

    // Validate auth từ cookies
    const cookieStore = await cookies()
    const authSupabase = createServerClient(
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

    let userId: string | null = null

    // Thử lấy user từ cookies
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (user) {
      userId = user.id
      console.log('✅ Got userId from cookies:', userId)
    } 
    // Nếu không có user từ cookies nhưng có clientUserId, validate clientUserId
    else if (clientUserId) {
      console.log('⚠️ No user from cookies, validating clientUserId from query...', clientUserId)
      // Validate user có tồn tại không
      const { data: userData, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', clientUserId)
        .single()
      
      if (userCheckError || !userData) {
        console.error('❌ Invalid userId from query:', userCheckError?.message)
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized',
          details: 'Please login first'
        }, { status: 401 })
      }
      
      userId = clientUserId
      console.log('✅ Got userId from query params:', userId)
    }
    
    // Nếu vẫn không có userId, báo lỗi
    if (!userId) {
      console.error('❌ No userId available')
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        details: 'Please login first'
      }, { status: 401 })
    }

    const { id } = params

    console.log('🔍 Fetching session:', { sessionId: id, userId })

    // Lấy session với messages
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        chat_messages (
          id,
          role,
          content,
          sources,
          created_at
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError)
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found',
        details: sessionError.message
      }, { status: 404 })
    }

    if (!session) {
      console.warn('⚠️ Session not found:', { sessionId: id, userId })
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found'
      }, { status: 404 })
    }

    // Log số lượng messages
    const messagesCount = session.chat_messages?.length || 0
    console.log('✅ Session found:', {
      sessionId: session.id,
      title: session.title,
      messagesCount: messagesCount
    })

    // Đảm bảo messages được sắp xếp theo created_at
    if (session.chat_messages && Array.isArray(session.chat_messages)) {
      session.chat_messages.sort((a: any, b: any) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    }

    return NextResponse.json({
      success: true,
      session: session
    })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Validate auth từ cookies
    const cookieStore = await cookies()
    const authSupabase = createServerClient(
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

    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        details: 'Please login first'
      }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Title is required'
      }, { status: 400 })
    }

    // Update title
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update({ 
        title: title.substring(0, 200), // Giới hạn 200 ký tự
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session title:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update session title',
        details: updateError.message
      }, { status: 500 })
    }

    if (!updatedSession) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: updatedSession
    })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lấy userId từ query params (fallback nếu cookies không có)
    const { searchParams } = new URL(request.url)
    const clientUserId = searchParams.get('userId')

    // Validate auth từ cookies
    const cookieStore = await cookies()
    const authSupabase = createServerClient(
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

    let userId: string | null = null

    // Thử lấy user từ cookies
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (user) {
      userId = user.id
      console.log('✅ Got userId from cookies for delete:', userId)
    } 
    // Nếu không có user từ cookies nhưng có clientUserId, validate clientUserId
    else if (clientUserId) {
      console.log('⚠️ No user from cookies, validating clientUserId from query for delete...', clientUserId)
      // Validate user có tồn tại không
      const { data: userData, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', clientUserId)
        .single()
      
      if (userCheckError || !userData) {
        console.error('❌ Invalid userId from query:', userCheckError?.message)
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized',
          details: 'Please login first'
        }, { status: 401 })
      }
      
      userId = clientUserId
      console.log('✅ Got userId from query params for delete:', userId)
    }
    
    // Nếu vẫn không có userId, báo lỗi
    if (!userId) {
      console.error('❌ No userId available for delete')
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        details: 'Please login first'
      }, { status: 401 })
    }

    const { id } = params

    console.log('🗑️ Deleting session:', { sessionId: id, userId })

    // Delete session (messages will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Error deleting session:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to delete session',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ Session deleted successfully:', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Delete session error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}
