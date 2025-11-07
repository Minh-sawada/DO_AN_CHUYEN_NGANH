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
      activity_type,
      action,
      details,
      ip_address,
      user_agent,
      risk_level = 'low'
    } = body

    console.log('📝 Log activity request:', {
      user_id,
      activity_type,
      action,
      has_details: !!details,
      risk_level
    })

    // Validate required fields
    if (!user_id || !activity_type || !action) {
      console.error('❌ Missing required fields:', { user_id, activity_type, action })
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, activity_type, action' },
        { status: 400 }
      )
    }

    // Get IP and user agent from request headers if not provided
    const clientIP = ip_address || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const clientUserAgent = user_agent || req.headers.get('user-agent') || 'unknown'

    console.log('📝 Calling log_user_activity RPC:', {
      p_user_id: user_id,
      p_activity_type: activity_type,
      p_action: action
    })

    // Log activity using RPC function
    const { data, error } = await supabaseAdmin.rpc('log_user_activity', {
      p_user_id: user_id,
      p_activity_type: activity_type,
      p_action: action,
      p_details: details || null,
      p_ip_address: clientIP,
      p_user_agent: clientUserAgent,
      p_risk_level: risk_level
    })

    if (error) {
      console.error('❌ Error logging activity:', error)
      console.error('   Error details:', JSON.stringify(error, null, 2))
      
      // Nếu lỗi là user bị ban, trả về message rõ ràng
      if (error.message && error.message.includes('banned')) {
        return NextResponse.json(
          { success: false, error: 'User is banned', banned: true },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to log activity: ' + error.message },
        { status: 500 }
      )
    }

    console.log('✅ Activity logged successfully:', data)
    return NextResponse.json({
      success: true,
      activity_id: data
    })

  } catch (error: any) {
    console.error('❌ Log activity API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

