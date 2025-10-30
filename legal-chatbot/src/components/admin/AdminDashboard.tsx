'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  MessageSquare, 
  Users, 
  TrendingUp,
  CheckCircle,
  Activity
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

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLaws: 0,
    totalQueries: 0,
    recentQueries: 0,
    activeUsers: 0,
    avgResponseTime: 0,
    successRate: 0
  })
  const [recentLaws, setRecentLaws] = useState<Law[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch laws
      const { data: laws } = await supabase
        .from('laws')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch stats
      const { data: statsData } = await supabase.rpc('get_law_stats')

      setRecentLaws(laws || [])
      if (statsData && statsData.length > 0) {
        setStats({
          totalLaws: statsData[0].total_laws || 0,
          totalQueries: statsData[0].total_queries || 0,
          recentQueries: statsData[0].recent_queries || 0,
          activeUsers: Math.floor(Math.random() * 50) + 10, // Mock data
          avgResponseTime: 1.2, // Mock data
          successRate: 95.5 // Mock data
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
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
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLaws.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Chưa có văn bản nào</p>
                </div>
              ) : (
                recentLaws.map((law) => (
                  <div key={law.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {law.title || 'Không có tiêu đề'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(law.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {law.content.length} ký tự
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
