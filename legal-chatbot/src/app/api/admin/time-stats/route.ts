import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').replace('bearer ', '').trim()

    if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Please login first' }, { status: 401 })
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: userResult, error: userError } = await supabaseAuth.auth.getUser()
    const userId = userResult?.user?.id

    if (userError || !userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Please login first' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile || !['admin', 'editor'].includes((profile as any).role)) {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now)
    monthStart.setMonth(monthStart.getMonth() - 1)
    monthStart.setHours(0, 0, 0, 0)

    const yearStart = new Date(now)
    yearStart.setFullYear(yearStart.getFullYear() - 1)
    yearStart.setHours(0, 0, 0, 0)

    const [todayQueries, weekQueries, monthQueries, yearQueries] = await Promise.all([
      (supabaseAdmin as any)
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', todayStart.toISOString()),
      (supabaseAdmin as any)
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', weekStart.toISOString()),
      (supabaseAdmin as any)
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', monthStart.toISOString()),
      (supabaseAdmin as any)
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', yearStart.toISOString())
    ])

    const [todayLaws, weekLaws, monthLaws, yearLaws] = await Promise.all([
      (supabaseAdmin as any)
        .from('laws')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', todayStart.toISOString()),
      (supabaseAdmin as any)
        .from('laws')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', weekStart.toISOString()),
      (supabaseAdmin as any)
        .from('laws')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', monthStart.toISOString()),
      (supabaseAdmin as any)
        .from('laws')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', yearStart.toISOString())
    ])

    const countUniqueUsers = async (startDate: Date): Promise<number> => {
      const { data, error } = await (supabaseAdmin as any)
        .from('user_activities')
        .select('user_id')
        .gte('created_at', startDate.toISOString())
        .not('user_id', 'is', null)
        .limit(10000)

      if (error || !data) return 0
      const uniqueUserIds = new Set((data as any[]).map((q) => q.user_id).filter(Boolean))
      return uniqueUserIds.size
    }

    const [todayUsers, weekUsers, monthUsers, yearUsers] = await Promise.all([
      countUniqueUsers(todayStart),
      countUniqueUsers(weekStart),
      countUniqueUsers(monthStart),
      countUniqueUsers(yearStart)
    ])

    const dailyQueriesData = await (supabaseAdmin as any)
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20000)

    const dailyData: Record<string, number> = {}
    if (dailyQueriesData.data) {
      ;(dailyQueriesData.data as any[]).forEach((q) => {
        const d = new Date(q.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        dailyData[key] = (dailyData[key] || 0) + 1
      })
    }
    const daily = Object.entries(dailyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({ date, count }))

    const monthlyQueriesData = await (supabaseAdmin as any)
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50000)

    const monthlyData: Record<string, number> = {}
    if (monthlyQueriesData.data) {
      ;(monthlyQueriesData.data as any[]).forEach((q) => {
        const d = new Date(q.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyData[key] = (monthlyData[key] || 0) + 1
      })
    }
    const monthly = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }))

    return NextResponse.json({
      success: true,
      timeStats: {
        today: {
          queries: todayQueries.count || 0,
          laws: todayLaws.count || 0,
          users: todayUsers
        },
        thisWeek: {
          queries: weekQueries.count || 0,
          laws: weekLaws.count || 0,
          users: weekUsers
        },
        thisMonth: {
          queries: monthQueries.count || 0,
          laws: monthLaws.count || 0,
          users: monthUsers
        },
        thisYear: {
          queries: yearQueries.count || 0,
          laws: yearLaws.count || 0,
          users: yearUsers
        },
        hourly: [],
        daily,
        monthly
      }
    })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
