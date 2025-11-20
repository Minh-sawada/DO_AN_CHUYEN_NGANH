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

    let query = (supabaseAdmin as any)
      .from('support_conversations')
      .select('*', { count: 'exact' })
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
        { error: 'Có lỗi xảy ra khi lấy danh sách cuộc trò chuyện', details: (error as any)?.message || String(error) },
        { status: 500 }
      )
    }

    // Lấy số tin nhắn chưa đọc + tin nhắn mới nhất cho mỗi conversation
    const conversationsWithMeta = await Promise.all(
      (data || []).map(async (conv: any) => {
        // Unread count (admin/system -> user)
        const { count: unreadCount } = await (supabaseAdmin as any)
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .eq('sender_type', 'user')

        // Latest message preview
        const { data: latestMsg } = await (supabaseAdmin as any)
          .from('support_messages')
          .select('content, created_at, sender_type, sender_name')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          ...conv,
          unread_count: unreadCount || 0,
          last_message: latestMsg || null
        }
      })
    )

    return NextResponse.json({
      data: conversationsWithMeta,
      count: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in conversations GET API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.', details: (error as any)?.message || String(error) },
      { status: 500 }
    )
  }
}

// POST: Tạo cuộc trò chuyện mới
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userName, userEmail, initialMessage } = body

    // Check existing open conversation for this user
    if (userId || userEmail) {
      let existingQuery = (supabaseAdmin as any)
        .from('support_conversations')
        .select('*')
        .eq('status', 'open')
        .order('last_message_at', { ascending: false })
        .limit(1)

      if (userId) existingQuery = existingQuery.eq('user_id', userId)
      else if (userEmail) existingQuery = existingQuery.eq('user_email', userEmail)

      const { data: existing, error: existingErr } = await existingQuery.maybeSingle()
      if (!existingErr && existing) {
        return NextResponse.json({ success: true, data: existing }, { status: 200 })
      }
    }

    // Tạo conversation mới
    const { data: conversation, error: convError } = await (supabaseAdmin as any)
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
        { error: 'Có lỗi xảy ra khi tạo cuộc trò chuyện', details: (convError as any)?.message || String(convError) },
        { status: 500 }
      )
    }

    // Nếu có tin nhắn ban đầu, tạo message
    if (initialMessage) {
      const { error: msgError } = await (supabaseAdmin as any)
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
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.', details: (error as any)?.message || String(error) },
      { status: 500 }
    )
  }
}

