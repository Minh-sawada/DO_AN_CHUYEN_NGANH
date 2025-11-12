import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: Lấy danh sách cuộc trò chuyện
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('support_conversations')
      .select(`
        *,
        profiles!support_conversations_user_id(full_name, email),
        assigned_admin:profiles!support_conversations_assigned_to(full_name, email),
        messages_count:support_messages(count)
      `, { count: 'exact' })
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi lấy danh sách cuộc trò chuyện' },
        { status: 500 }
      )
    }

    // Lấy số tin nhắn chưa đọc cho mỗi conversation
    const conversationsWithUnread = await Promise.all(
      (data || []).map(async (conv: any) => {
        const { count: unreadCount } = await supabaseAdmin
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_type', 'user') // Chỉ đếm tin nhắn từ admin/system

        return {
          ...conv,
          unread_count: unreadCount || 0
        }
      })
    )

    return NextResponse.json({
      data: conversationsWithUnread,
      count: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in conversations GET API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}

// POST: Tạo cuộc trò chuyện mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userName, userEmail, initialMessage } = body

    // Tạo conversation mới
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('support_conversations')
      .insert({
        user_id: userId || null,
        user_name: userName || null,
        user_email: userEmail || null,
        status: 'open',
        priority: 'normal'
      })
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi tạo cuộc trò chuyện' },
        { status: 500 }
      )
    }

    // Nếu có tin nhắn ban đầu, tạo message
    if (initialMessage) {
      const { error: msgError } = await supabaseAdmin
        .from('support_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userId || null,
          sender_type: 'user',
          sender_name: userName || null,
          content: initialMessage
        })

      if (msgError) {
        console.error('Error creating initial message:', msgError)
        // Không fail nếu message không tạo được, vẫn trả về conversation
      }
    }

    return NextResponse.json({
      success: true,
      data: conversation
    }, { status: 201 })
  } catch (error) {
    console.error('Error in conversations POST API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}

