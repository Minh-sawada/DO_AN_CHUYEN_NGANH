import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH: Đánh dấu tin nhắn đã đọc
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { conversationId } = body

    // Đánh dấu tất cả tin nhắn trong conversation là đã đọc
    if (conversationId) {
      const { error } = await supabaseAdmin
        .from('support_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking messages as read:', error)
        return NextResponse.json(
          { error: 'Có lỗi xảy ra khi đánh dấu đã đọc' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Đã đánh dấu tất cả tin nhắn là đã đọc'
      })
    }

    // Đánh dấu một tin nhắn cụ thể
    const { error } = await supabaseAdmin
      .from('support_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error marking message as read:', error)
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi đánh dấu đã đọc' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Đã đánh dấu tin nhắn là đã đọc'
    })
  } catch (error) {
    console.error('Error in read message API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}

