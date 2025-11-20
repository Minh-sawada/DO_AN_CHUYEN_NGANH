import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createSupabaseServerClient } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE - Xóa chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session } = await requireAuth()
    const supabase = await createSupabaseServerClient()
    const sessionId = params.id

    // Kiểm tra quyền truy cập session
    const { data: sessionData, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', session.user.id)
      .single()

    if (sessionError || !sessionData) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }

    // Xóa session (cascade sẽ xóa tất cả messages)
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      throw new Error('Failed to delete session')
    }

    // Log delete session action
    try {
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      const clientUserAgent = request.headers.get('user-agent') || 'unknown'

      await supabaseAdmin.rpc('log_user_activity', {
        p_user_id: session.user.id,
        p_activity_type: 'delete',
        p_action: 'delete_chat_session',
        p_details: {
          session_id: sessionId
        },
        p_ip_address: clientIP,
        p_user_agent: clientUserAgent,
        p_risk_level: 'low'
      } as any)
    } catch (logError) {
      console.error('Failed to log delete session activity:', logError)
      // Không throw - logging không nên làm gián đoạn flow chính
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    })
  } catch (error) {
    console.error('Delete session API error:', error)
    return NextResponse.json({ 
      error: (error as Error).message || 'Internal server error' 
    }, { status: 500 })
  }
}
