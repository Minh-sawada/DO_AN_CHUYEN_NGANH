import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE: Xóa 1 tin nhắn hỗ trợ theo id (admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await (supabaseAdmin as any)
      .from('support_messages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting support message:', error)
      return NextResponse.json(
        { success: false, error: 'Không thể xóa tin nhắn', details: (error as any)?.message || String(error) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in DELETE /api/support/messages/[id]:', err)
    return NextResponse.json(
      { success: false, error: 'Có lỗi xảy ra khi xóa tin nhắn', details: (err as any)?.message || String(err) },
      { status: 500 }
    )
  }
}
