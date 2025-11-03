import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Search by full_name if provided
    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users: ' + error.message },
        { status: 500 }
      )
    }

    // Get emails from auth.users using Admin API
    const profiles = data || []
    const usersWithEmails = []

    if (profiles.length > 0) {
      // Fetch all users from auth to get emails
      const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

      if (authError) {
        console.error('Error fetching auth users:', authError)
        // Continue without emails if auth query fails
      }

      // Map emails to profiles
      for (const profile of profiles) {
        const authUser = authUsersData?.users?.find((u: any) => u.id === profile.id)
        usersWithEmails.push({
          ...profile,
          email: authUser?.email || null
        })
      }
    }

    return NextResponse.json({
      success: true,
      users: usersWithEmails,
      total: count || 0
    })

  } catch (error: any) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

