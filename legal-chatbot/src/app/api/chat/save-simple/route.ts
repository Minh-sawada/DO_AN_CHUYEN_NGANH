import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { sessionId, role, content, sources, userId } = await request.json()

    if (!sessionId || !role || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields'
      })
    }

    // Kiểm tra session có tồn tại không
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .single()

    if (sessionError && sessionError.code === 'PGRST116') {
      // Session không tồn tại, tạo mới
      // Tạm thời set user_id = null để bypass foreign key constraint
      const { error: createSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          id: sessionId,
          user_id: null, // Tạm thời bypass foreign key
          title: content.substring(0, 50),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

    // Lưu tin nhắn
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        sources: sources || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

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
      message: newMessage
    })
  } catch (error) {
    console.error('Save simple API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
