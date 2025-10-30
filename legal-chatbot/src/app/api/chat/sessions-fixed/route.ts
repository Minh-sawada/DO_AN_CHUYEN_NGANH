import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
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
          created_at
        )
      `)
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: sessionsError.message
      })
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      user: {
        id: session.user.id,
        email: session.user.email
      }
    })
  } catch (error) {
    console.error('Sessions API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}

export async function POST(request: NextRequest) {
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

    const { title } = await request.json()

    // Tạo session với title rõ ràng để tránh trigger lỗi
    const { data: newSession, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: session.user.id,
        title: title || 'Cuộc trò chuyện mới'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating chat session:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: insertError.message
      })
    }

    return NextResponse.json({
      success: true,
      session: newSession
    })
  } catch (error) {
    console.error('Create session API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
