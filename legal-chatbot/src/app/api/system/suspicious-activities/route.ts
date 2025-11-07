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
    const status = searchParams.get('status')
    const minRiskScore = searchParams.get('min_risk_score')
    const limit = parseInt(searchParams.get('limit') || '1000') // Tăng limit lên 1000

    let query = supabaseAdmin
      .from('suspicious_activities')
      .select(`
        id,
        user_id,
        activity_type,
        description,
        risk_score,
        pattern_detected,
        status,
        details,
        reviewed_by,
        reviewed_at,
        created_at,
        profiles:user_id (
          id,
          full_name,
          role
        ),
        reviewed_by_profile:reviewed_by (
          id,
          full_name
        )
      `, { count: 'exact' })
      .order('risk_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (status) {
      query = query.eq('status', status)
    } else {
      // Mặc định chỉ lấy pending và reviewed
      query = query.in('status', ['pending', 'reviewed'])
    }
    if (minRiskScore) {
      query = query.gte('risk_score', parseInt(minRiskScore))
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching suspicious activities:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch suspicious activities: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activities: data || [],
      total: count || 0
    })

  } catch (error: any) {
    console.error('Suspicious activities API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, reviewed_by } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString()
    }

    if (reviewed_by) {
      updateData.reviewed_by = reviewed_by
    }

    const { data, error } = await supabaseAdmin
      .from('suspicious_activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating suspicious activity:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activity: data
    })

  } catch (error: any) {
    console.error('Update suspicious activity API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

