import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { sessionId, role, content, sources } = await request.json()

    if (!sessionId || !role || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields'
      })
    }

    // Tạo session nếu chưa có (sử dụng SQL trực tiếp)
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionError && sessionError.code === 'PGRST116') {
      // Session không tồn tại, tạo mới bằng SQL trực tiếp với RLS bypass
      const { error: createSessionError } = await supabase
        .rpc('create_session_without_auth', {
          session_id: sessionId,
          session_title: content.substring(0, 50)
        })

      if (createSessionError) {
        console.error('Error creating session:', createSessionError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create session',
          details: createSessionError.message
        })
      }
    }

    // Lưu tin nhắn bằng function
    const { data: messageId, error: insertError } = await supabase
      .rpc('save_message_without_auth', {
        session_id: sessionId,
        message_role: role,
        message_content: content,
        message_sources: sources || null
      })

    if (insertError) {
      console.error('Error creating chat message:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: insertError.message
      })
    }

    return NextResponse.json({
      success: true,
      messageId: messageId
    })
  } catch (error) {
    console.error('Test save API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
