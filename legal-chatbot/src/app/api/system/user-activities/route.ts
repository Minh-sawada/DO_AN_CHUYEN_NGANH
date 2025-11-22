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
    const limit = parseInt(searchParams.get('limit') || '1000') // Tăng limit lên 1000
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    console.log('📥 Fetching user activities:', {
      userId,
      activityType,
      riskLevel,
      limit,
      offset
    })

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
          full_name,
          role
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (activityType && activityType !== 'all') {
      console.log('🔍 Filtering by activity_type:', activityType)
      query = query.eq('activity_type', activityType)
    }
    if (riskLevel && riskLevel !== 'all') {
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
      console.error('❌ Error fetching user activities:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities: ' + error.message },
        { status: 500 }
      )
    }

    // Log activity types trong kết quả để debug
    if (data && data.length > 0) {
      const activityTypes = [...new Set(data.map((a: any) => a.activity_type))]
      console.log('📊 Activity types in result:', activityTypes)
      console.log('📊 Filter was:', activityType, '| Result count:', data.length)
    }

    console.log('✅ Fetched activities:', data?.length || 0, 'total:', count)
    return NextResponse.json({
      success: true,
      activities: data || [],
      total: count || 0
    })

  } catch (error: any) {
    console.error('❌ User activities API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

