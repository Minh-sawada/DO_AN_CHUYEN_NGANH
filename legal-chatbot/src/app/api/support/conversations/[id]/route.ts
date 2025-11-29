import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH: Cập nhật cuộc trò chuyện
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, priority, assignedTo } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
    }

    if (priority) {
      updateData.priority = priority
    }

    if (assignedTo !== undefined) {
      updateData.assigned_to = assignedTo
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('support_conversations')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        profiles!support_conversations_user_id(full_name, email),
        assigned_admin:profiles!support_conversations_assigned_to(full_name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating conversation:', error)
      return NextResponse.json(
        { error: 'Có lỗi xảy ra khi cập nhật cuộc trò chuyện' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error in conversation PATCH API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}

// GET: Lấy thông tin cuộc trò chuyện
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('support_conversations')
      .select(`
        *,
        profiles!support_conversations_user_id(full_name, email, avatar_url),
        assigned_admin:profiles!support_conversations_assigned_to(full_name, email, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Không tìm thấy cuộc trò chuyện' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error in conversation GET API:', error)
    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}

