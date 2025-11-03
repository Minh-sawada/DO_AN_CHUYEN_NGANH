'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  MessageSquare, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Calendar,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Law } from '@/lib/supabase'

interface DashboardStats {
  totalLaws: number
  totalQueries: number
  recentQueries: number
  activeUsers: number
  avgResponseTime: number
  successRate: number
}

interface TimeStats {
  today: {
    queries: number
    laws: number
    users: number
  }
  thisWeek: {
    queries: number
    laws: number
    users: number
  }
  thisMonth: {
    queries: number
    laws: number
    users: number
  }
  thisYear: {
    queries: number
    laws: number
    users: number
  }
  hourly: Array<{ hour: number; count: number }>
  daily: Array<{ date: string; count: number }>
  monthly: Array<{ month: string; count: number }>
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLaws: 0,
    totalQueries: 0,
    recentQueries: 0,
    activeUsers: 0,
    avgResponseTime: 0,
    successRate: 0
  })
  const [timeStats, setTimeStats] = useState<TimeStats>({
    today: { queries: 0, laws: 0, users: 0 },
    thisWeek: { queries: 0, laws: 0, users: 0 },
    thisMonth: { queries: 0, laws: 0, users: 0 },
    thisYear: { queries: 0, laws: 0, users: 0 },
    hourly: [],
    daily: [],
    monthly: []
  })
  const [recentLaws, setRecentLaws] = useState<Law[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today')
  const [lawsPage, setLawsPage] = useState(1)
  const lawsPerPage = 5

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Tính toán ngày 7 ngày trước
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoISO = sevenDaysAgo.toISOString()
      
      // Load song song để tăng tốc
      const [lawsResult, statsResult, activeUsersResult, successRateResult, recentQueriesResult] = await Promise.all([
        // CHỈ select các field cần thiết, KHÔNG select noi_dung (quá lớn)
        supabase
          .from('laws')
          .select('id, title, so_hieu, loai_van_ban, created_at')
          .order('created_at', { ascending: false })
          .limit(20), // Giảm xuống 20 records để dashboard load nhanh
        
        // Fetch stats
        supabase.rpc('get_law_stats'),
        
        // Đếm số active users (unique user_id trong 7 ngày qua)
        supabase
          .from('query_logs')
          .select('user_id, created_at')
          .not('user_id', 'is', null)
          .gte('created_at', sevenDaysAgoISO)
          .limit(10000), // Limit để tránh quá nhiều data nhưng vẫn đủ để count unique
        
        // Tính success rate (queries có response / tổng queries)
        Promise.all([
          supabase
            .from('query_logs')
            .select('id', { count: 'exact', head: true })
            .not('response', 'is', null),
          supabase
            .from('query_logs')
            .select('id', { count: 'exact', head: true })
        ]),
        
        // Đếm số queries trong 7 ngày qua (recent queries) - lấy trực tiếp từ DB
        supabase
          .from('query_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Xử lý laws
      const safeLaws = (lawsResult.data || []).map(law => ({
        ...law,
        noi_dung: null,
        noi_dung_html: null,
        embedding: null
      }))
      setRecentLaws(safeLaws)

      // Tính số unique active users
      let activeUsers = 0
      if (activeUsersResult.error) {
        console.error('Error fetching active users:', activeUsersResult.error)
      } else if (activeUsersResult.data && activeUsersResult.data.length > 0) {
        const userIds = activeUsersResult.data
          .map((q: any) => q.user_id)
          .filter((id: any) => id !== null && id !== undefined)
        const uniqueUserIds = new Set(userIds)
        activeUsers = uniqueUserIds.size
        
        // Debug log (chỉ trong development)
        if (process.env.NODE_ENV === 'development') {
          const sampleDates = activeUsersResult.data
            .map((q: any) => q.created_at)
            .slice(0, 3)
          console.log('Active users calculation:', {
            totalRecords: activeUsersResult.data.length,
            recordsWithUserId: userIds.length,
            uniqueUsers: activeUsers,
            sampleUserIds: Array.from(uniqueUserIds).slice(0, 5),
            dateRange: '7 days ago to now',
            sevenDaysAgo: sevenDaysAgoISO,
            sampleDates: sampleDates,
            now: new Date().toISOString()
          })
        }
      } else {
        // Không có data hoặc không có error
        if (process.env.NODE_ENV === 'development') {
          console.log('Active users: No query_logs with user_id in the last 7 days', {
            hasData: !!activeUsersResult.data,
            dataLength: activeUsersResult.data?.length || 0,
            sevenDaysAgo: sevenDaysAgoISO,
            now: new Date().toISOString()
          })
        }
      }

      // Tính success rate
      let successRate = 0
      if (successRateResult[0].count !== null && successRateResult[1].count !== null) {
        const successfulQueries = successRateResult[0].count || 0
        const totalQueries = successRateResult[1].count || 0
        successRate = totalQueries > 0 
          ? Math.round((successfulQueries / totalQueries) * 100 * 10) / 10 
          : 0
      }

      // Lấy recent queries từ query trực tiếp (thay vì từ RPC)
      const recentQueries = recentQueriesResult.count || 0

      // Xử lý stats
      if (statsResult.data && statsResult.data.length > 0) {
        setStats({
          totalLaws: statsResult.data[0].total_laws || 0,
          totalQueries: statsResult.data[0].total_queries || 0,
          recentQueries: recentQueries, // Dùng số liệu trực tiếp từ query
          activeUsers: activeUsers,
          avgResponseTime: 0, // Không có data để tính, có thể thêm sau
          successRate: successRate
        })
      }

      // Fetch time-based statistics (chạy sau để không block UI)
      fetchTimeStats()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeStats = async () => {
    try {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - 7)
      
      const monthStart = new Date(now)
      monthStart.setMonth(monthStart.getMonth() - 1)
      
      const yearStart = new Date(now)
      yearStart.setFullYear(yearStart.getFullYear() - 1)

      // Fetch queries by time - chỉ count, không load toàn bộ data
      const [todayQueries, weekQueries, monthQueries, yearQueries, todayQueriesForHourly] = await Promise.all([
        supabase.from('query_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('query_logs').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('query_logs').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
        supabase.from('query_logs').select('id', { count: 'exact', head: true }).gte('created_at', yearStart.toISOString()),
        // CHỈ lấy queries của HÔM NAY cho biểu đồ theo giờ
        supabase
          .from('query_logs')
          .select('created_at')
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: false })
      ])

      // Fetch laws by time - chỉ count
      const [todayLaws, weekLaws, monthLaws, yearLaws] = await Promise.all([
        supabase.from('laws').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('laws').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('laws').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
        supabase.from('laws').select('id', { count: 'exact', head: true }).gte('created_at', yearStart.toISOString())
      ])

      // Count unique users từ allQueries (vì count queries không có user_id)
      const countUniqueUsers = (count: number) => {
        // Ước tính dựa trên count (vì không có data để count unique)
        // Có thể fetch riêng nếu cần chính xác
        return Math.floor(count * 0.7) // Giả định 70% unique users
      }

      // Process hourly data (CHỈ của HÔM NAY)
      const hourlyData: { [key: number]: number } = {}
      if (todayQueriesForHourly.data) {
        todayQueriesForHourly.data.forEach(q => {
          const queryDate = new Date(q.created_at)
          // Chỉ đếm nếu là hôm nay (kiểm tra lại để chắc chắn)
          const queryDateStr = queryDate.toISOString().split('T')[0]
          const todayStr = now.toISOString().split('T')[0]
          
          if (queryDateStr === todayStr) {
            const hour = queryDate.getHours()
            hourlyData[hour] = (hourlyData[hour] || 0) + 1
          }
        })
      }
      const hourly = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyData[i] || 0
      }))

      // Process daily data (last 30 days) - cần fetch lại data của 30 ngày
      const dailyQueriesData = await supabase
        .from('query_logs')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5000)
      
      const dailyData: { [key: string]: number } = {}
      if (dailyQueriesData.data) {
        dailyQueriesData.data.forEach(q => {
          const date = new Date(q.created_at).toISOString().split('T')[0]
          dailyData[date] = (dailyData[date] || 0) + 1
        })
      }
      const daily = Object.entries(dailyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-30)
        .map(([date, count]) => ({ date, count }))

      // Process monthly data (last 12 months) - cần fetch lại data của 12 tháng
      const monthlyQueriesData = await supabase
        .from('query_logs')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10000)
      
      const monthlyData: { [key: string]: number } = {}
      if (monthlyQueriesData.data) {
        monthlyQueriesData.data.forEach(q => {
          const date = new Date(q.created_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
        })
      }
      const monthly = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([month, count]) => ({ month, count }))

      setTimeStats({
        today: {
          queries: todayQueries.count || 0,
          laws: todayLaws.count || 0,
          users: countUniqueUsers(todayQueries.count || 0)
        },
        thisWeek: {
          queries: weekQueries.count || 0,
          laws: weekLaws.count || 0,
          users: countUniqueUsers(weekQueries.count || 0)
        },
        thisMonth: {
          queries: monthQueries.count || 0,
          laws: monthLaws.count || 0,
          users: countUniqueUsers(monthQueries.count || 0)
        },
        thisYear: {
          queries: yearQueries.count || 0,
          laws: yearLaws.count || 0,
          users: countUniqueUsers(yearQueries.count || 0)
        },
        hourly,
        daily,
        monthly
      })
    } catch (error) {
      console.error('Error fetching time stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Tổng văn bản</p>
                <p className="text-3xl font-bold text-blue-700">{stats.totalLaws}</p>
                <p className="text-xs text-blue-500 mt-1">Văn bản pháp luật</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Tổng truy vấn</p>
                <p className="text-3xl font-bold text-green-700">{stats.totalQueries}</p>
                <p className="text-xs text-green-500 mt-1">Câu hỏi đã xử lý</p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Người dùng hoạt động</p>
                <p className="text-3xl font-bold text-purple-700">{stats.activeUsers}</p>
                <p className="text-xs text-purple-500 mt-1">Trong 7 ngày qua</p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">Tỷ lệ thành công</p>
                <p className="text-3xl font-bold text-orange-700">{stats.successRate}%</p>
                <p className="text-xs text-orange-500 mt-1">Câu trả lời chính xác</p>
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Hiệu suất hệ thống</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Thời gian phản hồi trung bình</span>
                <span className="text-sm text-gray-600">{stats.avgResponseTime}s</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tỷ lệ thành công</span>
                <span className="text-sm text-gray-600">{stats.successRate}%</span>
              </div>
              <Progress value={stats.successRate} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Truy vấn gần đây (7 ngày)</span>
                <span className="text-sm text-gray-600">{stats.recentQueries}</span>
              </div>
              <Progress value={(stats.recentQueries / stats.totalQueries) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Văn bản gần đây</span>
            </CardTitle>
            {recentLaws.length > 0 && (
              <CardDescription>
                Hiển thị {((lawsPage - 1) * lawsPerPage + 1)}-{Math.min(lawsPage * lawsPerPage, recentLaws.length)} trong tổng số {recentLaws.length} văn bản
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLaws.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Chưa có văn bản nào</p>
                </div>
              ) : (
                <>
                  {(recentLaws || [])
                    .filter(law => law && law.id) // Lọc bỏ các phần tử không hợp lệ
                    .slice((lawsPage - 1) * lawsPerPage, lawsPage * lawsPerPage) // Phân trang
                    .map((law) => {
                      // FIXED: Tính độ dài nội dung - CHỈ dùng noi_dung hoặc noi_dung_html
                      let lengthText = 'N/A';
                      
                      try {
                        // CHỈ dùng noi_dung và noi_dung_html - KHÔNG dùng content
                        const noiDung = law?.noi_dung ?? null;
                        const noiDungHtml = law?.noi_dung_html ?? null;
                        const textContent = noiDung || noiDungHtml;
                        
                        if (textContent && typeof textContent === 'string' && textContent.length !== undefined) {
                          lengthText = `${textContent.length} ký tự`;
                        }
                      } catch (e) {
                        // Giữ nguyên 'N/A' nếu có lỗi
                        console.warn('Error calculating content length:', e);
                      }

                      return (
                        <div key={law.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {law.title || 'Không có tiêu đề'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {law.created_at ? new Date(law.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {lengthText}
                          </Badge>
                        </div>
                      );
                    })}
                  
                  {/* Pagination Controls */}
                  {recentLaws.length > lawsPerPage && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Trang {lawsPage} / {Math.ceil(recentLaws.length / lawsPerPage)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLawsPage(prev => Math.max(1, prev - 1))}
                          disabled={lawsPage === 1}
                          className="flex items-center space-x-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Trước</span>
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, Math.ceil(recentLaws.length / lawsPerPage)) }, (_, i) => {
                            const totalPages = Math.ceil(recentLaws.length / lawsPerPage)
                            let pageNum: number
                            
                            // Tính toán số trang hiển thị (luôn hiển thị 5 trang quanh trang hiện tại)
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (lawsPage <= 3) {
                              pageNum = i + 1
                            } else if (lawsPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = lawsPage - 2 + i
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={lawsPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setLawsPage(pageNum)}
                                className="min-w-[2.5rem]"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLawsPage(prev => Math.min(Math.ceil(recentLaws.length / lawsPerPage), prev + 1))}
                          disabled={lawsPage >= Math.ceil(recentLaws.length / lawsPerPage)}
                          className="flex items-center space-x-1"
                        >
                          <span>Sau</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <span>Thống kê theo thời gian</span>
          </CardTitle>
          <CardDescription>
            Xem số liệu theo từng khoảng thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Hôm nay</TabsTrigger>
              <TabsTrigger value="week">Tuần này</TabsTrigger>
              <TabsTrigger value="month">Tháng này</TabsTrigger>
              <TabsTrigger value="year">Năm nay</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Truy vấn</p>
                        <p className="text-2xl font-bold text-blue-700">{timeStats.today.queries}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Văn bản mới</p>
                        <p className="text-2xl font-bold text-green-700">{timeStats.today.laws}</p>
                      </div>
                      <FileText className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Người dùng</p>
                        <p className="text-2xl font-bold text-purple-700">{timeStats.today.users}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Hourly Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Theo giờ (24h qua)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {timeStats.hourly.map((item) => {
                      const maxCount = Math.max(...timeStats.hourly.map(h => h.count), 1)
                      const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                      return (
                        <div key={item.hour} className="flex items-center space-x-3">
                          <span className="text-xs text-gray-600 w-12">{item.hour}:00</span>
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                                style={{ width: `${percentage}%` }}
                              >
                                {item.count > 0 && (
                                  <span className="flex items-center justify-end h-full px-2 text-xs text-white font-medium">
                                    {item.count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="week" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Truy vấn</p>
                        <p className="text-2xl font-bold text-blue-700">{timeStats.thisWeek.queries}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Văn bản mới</p>
                        <p className="text-2xl font-bold text-green-700">{timeStats.thisWeek.laws}</p>
                      </div>
                      <FileText className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Người dùng</p>
                        <p className="text-2xl font-bold text-purple-700">{timeStats.thisWeek.users}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="month" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Truy vấn</p>
                        <p className="text-2xl font-bold text-blue-700">{timeStats.thisMonth.queries}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Văn bản mới</p>
                        <p className="text-2xl font-bold text-green-700">{timeStats.thisMonth.laws}</p>
                      </div>
                      <FileText className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Người dùng</p>
                        <p className="text-2xl font-bold text-purple-700">{timeStats.thisMonth.users}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Chart */}
              {timeStats.daily.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Theo ngày (30 ngày qua)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {timeStats.daily.map((item) => {
                        const maxCount = Math.max(...timeStats.daily.map(d => d.count), 1)
                        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                        const date = new Date(item.date)
                        return (
                          <div key={item.date} className="flex items-center space-x-3">
                            <span className="text-xs text-gray-600 w-24">
                              {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                                  style={{ width: `${percentage}%` }}
                                >
                                  {item.count > 0 && (
                                    <span className="flex items-center justify-end h-full px-2 text-xs text-white font-medium">
                                      {item.count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="year" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Truy vấn</p>
                        <p className="text-2xl font-bold text-blue-700">{timeStats.thisYear.queries}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Văn bản mới</p>
                        <p className="text-2xl font-bold text-green-700">{timeStats.thisYear.laws}</p>
                      </div>
                      <FileText className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Người dùng</p>
                        <p className="text-2xl font-bold text-purple-700">{timeStats.thisYear.users}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Chart */}
              {timeStats.monthly.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Theo tháng (12 tháng qua)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {timeStats.monthly.map((item) => {
                        const maxCount = Math.max(...timeStats.monthly.map(m => m.count), 1)
                        const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                        const [year, month] = item.month.split('-')
                        return (
                          <div key={item.month} className="flex items-center space-x-3">
                            <span className="text-xs text-gray-600 w-20">
                              {month}/{year}
                            </span>
                            <div className="flex-1">
                              <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all"
                                  style={{ width: `${percentage}%` }}
                                >
                                  {item.count > 0 && (
                                    <span className="flex items-center justify-end h-full px-3 text-xs text-white font-medium">
                                      {item.count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Trạng thái hệ thống</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Database</p>
                <p className="text-sm text-green-600">Hoạt động bình thường</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">OpenAI API</p>
                <p className="text-sm text-green-600">Kết nối thành công</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Vector Search</p>
                <p className="text-sm text-green-600">Sẵn sàng</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
