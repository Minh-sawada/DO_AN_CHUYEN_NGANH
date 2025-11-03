import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { data, error } = await supabaseAdmin.rpc('ban_user', {
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

    // Log ban action
    await supabaseAdmin.rpc('log_user_activity', {
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

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id parameter' },
        { status: 400 }
      )
    }

    // Unban user using RPC function
    const { data, error } = await supabaseAdmin.rpc('unban_user', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error unbanning user:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to unban user: ' + error.message },
        { status: 500 }
      )
    }

    // Log unban action
    if (unbannedBy) {
      await supabaseAdmin.rpc('log_user_activity', {
        p_user_id: unbannedBy,
        p_activity_type: 'admin_action',
        p_action: 'unban_user',
        p_details: {
          unbanned_user_id: userId
        },
        p_risk_level: 'low'
      })
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

