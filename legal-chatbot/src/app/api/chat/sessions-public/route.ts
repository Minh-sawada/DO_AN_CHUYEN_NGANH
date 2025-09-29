import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lấy userId từ query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Lấy sessions (có thể filter theo userId nếu có)
    let query = supabase
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
      .order('created_at', { ascending: false })
      .limit(50)

    // Nếu có userId, chỉ lấy sessions của user đó
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: sessionsError.message
      })
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || []
    })
  } catch (error) {
    console.error('Sessions public API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
