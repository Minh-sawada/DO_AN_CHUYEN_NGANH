import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Supabase auth error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Auth error',
        details: error.message
      })
    }

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session found',
        debug: 'User not authenticated'
      })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID is required'
      })
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: messagesError.message
      })
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    })
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse body trước để có thể lấy userId
    const body = await request.json()
    const { sessionId, role, content, sources, userId: clientUserId } = body

    if (!sessionId || !role || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields'
      })
    }

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

    let userId: string | null = null

    // Thử lấy user từ cookies
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    
    if (user) {
      userId = user.id
    } 
    // Nếu không có user từ cookies nhưng có clientUserId, validate clientUserId
    else if (clientUserId) {
      // Validate user có tồn tại không
      const { data: userData, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', clientUserId)
        .single()
      
      if (userCheckError || !userData) {
        console.error('❌ Invalid userId from client:', userCheckError?.message)
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized',
          details: 'Please login first'
        }, { status: 401 })
      }
      
      userId = clientUserId
    }
    
    // Nếu vẫn không có userId, báo lỗi
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        details: 'Please login first'
      }, { status: 401 })
    }

    console.log('💾 Saving message:', { sessionId, role, contentLength: content.length, userId })

    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        sources: sources || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating chat message:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: insertError.message
      })
    }

    console.log('✅ Message saved:', newMessage.id)
    return NextResponse.json({
      success: true,
      message: newMessage
    })
  } catch (error) {
    console.error('❌ Create message API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
