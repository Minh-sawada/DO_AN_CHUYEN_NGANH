import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin.rpc('check_user_ban_status', {
      p_email: email
    })

    if (error) {
      console.error('check-ban RPC error:', error)
      return NextResponse.json(
        { success: false, error: 'Không kiểm tra được trạng thái tài khoản' },
        { status: 500 }
      )
    }

    const record = Array.isArray(data) ? data[0] : data

    if (!record || !record.user_id) {
      return NextResponse.json({
        success: true,
        userExists: false,
        isBanned: false
      })
    }

    return NextResponse.json({
      success: true,
      userExists: true,
      userId: record.user_id,
      email: record.email,
      role: record.role,
      isBanned: record.is_banned,
      banInfo: record.is_banned
        ? {
            banType: record.ban_type,
            reason: record.reason,
            bannedUntil: record.banned_until
          }
        : null
    })
  } catch (error) {
    console.error('check-ban API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


