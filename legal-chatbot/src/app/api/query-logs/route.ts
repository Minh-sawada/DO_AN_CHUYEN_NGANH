import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Sử dụng service role key để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Lấy userId từ query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Lấy query logs (có thể filter theo userId nếu có)
    let query = supabase
      .from('query_logs')
      .select(`
        id,
        user_id,
        query,
        matched_ids,
        response,
        created_at,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    // Nếu có userId, chỉ lấy logs của user đó
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: queryLogs, error: queryLogsError } = await query

    if (queryLogsError) {
      console.error('Error fetching query logs:', queryLogsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database error',
        details: queryLogsError.message
      })
    }

    return NextResponse.json({
      success: true,
      queryLogs: queryLogs || []
    })
  } catch (error) {
    console.error('Query logs API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error'
    })
  }
}
