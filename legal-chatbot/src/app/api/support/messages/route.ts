import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: Lấy tin nhắn trong cuộc trò chuyện
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Thiếu conversationId' },
        { status: 400 }
      )
    }

    const { data, error, count } = await (supabaseAdmin as any)
      .from('support_messages')
      .select(`*`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi lấy tin nhắn', details: (error as any)?.message || String(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in messages GET API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}

// POST: Gửi tin nhắn mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, senderId, senderType, senderName, content } = body

    if (!conversationId || !senderType || !content) {
      return NextResponse.json(
        { error: 'Thiếu thông tin cần thiết' },
        { status: 400 }
      )
    }

    // Kiểm tra conversation có tồn tại không
    const { data: conversation, error: convError } = await (supabaseAdmin as any)
      .from('support_conversations')
      .select('id, status')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Cuộc trò chuyện không tồn tại', details: (convError as any)?.message || String(convError) },
        { status: 404 }
      )
    }

    // Nếu conversation đã đóng, không cho phép gửi tin nhắn mới (trừ admin)
    if (conversation.status === 'closed' && senderType !== 'admin') {
      return NextResponse.json(
        { error: 'Cuộc trò chuyện đã được đóng' },
        { status: 400 }
      )
    }

    // Tạo tin nhắn mới
    const { data: message, error: msgError } = await (supabaseAdmin as any)
      .from('support_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId || null,
        sender_type: senderType,
        sender_name: senderName || null,
        content: content.trim(),
        is_read: senderType === 'admin' // Tin nhắn từ user: chưa đọc; từ admin: mặc định đã đọc
      } as any)
      .select(`*`)
      .single()

    if (msgError) {
      console.error('Error creating message:', msgError)
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi gửi tin nhắn', details: (msgError as any)?.message || String(msgError) },
        { status: 500 }
      )
    }

    // Nếu conversation đang closed và admin gửi tin nhắn, mở lại
    if (conversation.status === 'closed' && senderType === 'admin') {
      await (supabaseAdmin as any)
        .from('support_conversations')
        .update({ status: 'open' })
        .eq('id', conversationId)
    }

    return NextResponse.json({
      success: true,
      data: message
    }, { status: 201 })
  } catch (error) {
    console.error('Error in messages POST API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.', details: (error as any)?.message || String(error) },
      { status: 500 }
    )
  }
}

