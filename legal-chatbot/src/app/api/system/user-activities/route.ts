import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const activityType = searchParams.get('activity_type')
    const riskLevel = searchParams.get('risk_level')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabaseAdmin
      .from('user_activities')
      .select(`
        id,
        user_id,
        activity_type,
        action,
        details,
        ip_address,
        user_agent,
        risk_level,
        created_at,
        profiles (
          id,
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching user activities:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activities: data || [],
      total: count || 0
    })

  } catch (error: any) {
    console.error('User activities API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

