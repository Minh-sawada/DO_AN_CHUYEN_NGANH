import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, Profile } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      user_id,
      reason,
      ban_type = 'temporary',
      duration_hours = 24,
      banned_by,
      notes
    } = body

    // Validate required fields
    if (!user_id || !reason || !banned_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, reason, banned_by' },
        { status: 400 }
      )
    }

    // Ban user using RPC function
    const { data, error } = await (supabaseAdmin as any).rpc('ban_user', {
      p_user_id: user_id,
      p_reason: reason,
      p_banned_by: banned_by,
      p_ban_type: ban_type,
      p_duration_hours: duration_hours,
      p_notes: notes || null
    })

    if (error) {
      console.error('Error banning user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to ban user: ' + error.message },
        { status: 500 }
      )
    }

    // Log ban action (chỉ log nếu banned_by là admin hoặc editor)
    try {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', banned_by)
        .single() as { data: Pick<Profile, 'role'> | null }
      
      // Chỉ log nếu user là admin hoặc editor
      if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'editor')) {
        await (supabaseAdmin as any).rpc('log_user_activity', {
          p_user_id: banned_by,
          p_activity_type: 'admin_action',
          p_action: 'ban_user',
          p_details: {
            banned_user_id: user_id,
            reason: reason,
            ban_type: ban_type,
            duration_hours: duration_hours
          },
          p_risk_level: 'low'
        })
      }
    } catch (logError) {
      console.error('Failed to log ban action:', logError)
      // Không throw - logging không nên làm gián đoạn flow chính
    }

    return NextResponse.json({
      success: true,
      ban_id: data,
      message: `User has been ${ban_type === 'permanent' ? 'permanently' : 'temporarily'} banned` 
    })

  } catch (error: any) {
    console.error('Ban user API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const unbannedBy = searchParams.get('unbanned_by')

    console.log(' Unban request:', { userId, unbannedBy })

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id parameter' },
        { status: 400 }
      )
    }

    // Kiểm tra xem user có bị ban không trước khi unban
    const { data: banCheck, error: checkError } = await supabaseAdmin
      .from('banned_users')
      .select('id, user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking ban status:', checkError)
      return NextResponse.json(
        { success: false, error: 'Failed to check ban status: ' + checkError.message },
        { status: 500 }
      )
    }

    if (!banCheck) {
      console.log(' User is not banned:', userId)
      return NextResponse.json(
        { success: false, error: 'User is not currently banned' },
        { status: 404 }
      )
    }

    // Unban user using RPC function
    const { data, error } = await (supabaseAdmin as any).rpc('unban_user', {
      p_user_id: userId
    })

    console.log(' Unban RPC result:', { data, error })

    if (error) {
      console.error('Error unbanning user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to unban user: ' + error.message },
        { status: 500 }
      )
    }

    // Kiểm tra xem có thực sự unban được không (data là boolean từ FOUND)
    // FOUND trả về true nếu có row bị xóa, false nếu không có row nào
    if (data === false || data === null) {
      console.warn(' Unban returned false/null, but user was found in banned_users')
      // Vẫn tiếp tục vì đã kiểm tra ở trên
    }

    // Xác nhận lại xem user đã được unban chưa
    const { data: verifyCheck, error: verifyError } = await supabaseAdmin
      .from('banned_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (verifyError) {
      console.error('Error verifying unban:', verifyError)
      // Không fail vì có thể đã unban thành công
    } else if (verifyCheck) {
      console.error(' User still in banned_users after unban!')
      return NextResponse.json(
        { success: false, error: 'Failed to unban user - user still in banned list' },
        { status: 500 }
      )
    } else {
      console.log(' User successfully unbanned:', userId)
    }

    // Log unban action (chỉ log nếu unbannedBy là admin hoặc editor)
    if (unbannedBy) {
      try {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', unbannedBy)
          .single() as { data: Pick<Profile, 'role'> | null }
        
        // Chỉ log nếu user là admin hoặc editor
        if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'editor')) {
          await (supabaseAdmin as any).rpc('log_user_activity', {
            p_user_id: unbannedBy,
            p_activity_type: 'admin_action',
            p_action: 'unban_user',
            p_details: {
              unbanned_user_id: userId
            },
            p_risk_level: 'low'
          })
        }
      } catch (logError) {
        console.error('Failed to log unban action:', logError)
        // Không throw - logging không nên làm gián đoạn flow chính
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User has been unbanned'
    })

  } catch (error: any) {
    console.error('Unban user API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

