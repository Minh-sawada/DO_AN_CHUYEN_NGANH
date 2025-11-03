import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const banType = searchParams.get('ban_type')
    const includeExpired = searchParams.get('include_expired') === 'true'

    let query = supabaseAdmin
      .from('banned_users')
      .select(`
        id,
        user_id,
        reason,
        ban_type,
        banned_until,
        banned_by,
        notes,
        created_at,
        profiles:user_id (
          id,
          full_name
        ),
        banned_by_profile:banned_by (
          id,
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (banType) {
      query = query.eq('ban_type', banType)
    }

    if (!includeExpired) {
      // Chỉ lấy các ban còn hiệu lực
      query = query.or('ban_type.eq.permanent,banned_until.gt.' + new Date().toISOString())
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching banned users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch banned users: ' + error.message },
        { status: 500 }
      )
    }

    // Tính toán status cho mỗi ban
    const bannedUsersWithStatus = (data || []).map((ban: any) => {
      const isExpired = ban.ban_type === 'temporary' && ban.banned_until && new Date(ban.banned_until) < new Date()
      return {
        ...ban,
        is_expired: isExpired,
        status: isExpired ? 'expired' : (ban.ban_type === 'permanent' ? 'permanent' : 'active')
      }
    })

    return NextResponse.json({
      success: true,
      banned_users: bannedUsersWithStatus,
      total: count || 0
    })

  } catch (error: any) {
    console.error('Banned users API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

