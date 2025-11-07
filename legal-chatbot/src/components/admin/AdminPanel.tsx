'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Loader2,
  Trash2,
  Database,
  Eye,
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Law, Profile } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { AdminDashboard } from './AdminDashboard'
import { BackupStatus } from './BackupStatus'
import { LawUpload } from './LawUpload'
import { SystemManagement } from './SystemManagement'

interface QueryLogWithProfile {
  id: string // UUID
  user_id: string | null
  query: string
  matched_ids: string[] | null // UUID[]
  response: string | null
  created_at: string
  profiles?: {
    full_name: string | null
    email: string
  } | null
}

export function AdminPanel() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [laws, setLaws] = useState<Law[]>([])
  const [queryLogs, setQueryLogs] = useState<QueryLogWithProfile[]>([])
  const [stats, setStats] = useState({
    totalLaws: 0,
    totalQueries: 0,
    recentQueries: 0
  })
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [loadingLawDetail, setLoadingLawDetail] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLoaiVanBan, setFilterLoaiVanBan] = useState<string>('all')
  const [lawsPage, setLawsPage] = useState(1)
  const [lawsPerPage, setLawsPerPage] = useState(20)
  const [totalLaws, setTotalLaws] = useState(0)
  const { toast } = useToast()

  const [lawsLoading, setLawsLoading] = useState(false)
  const [queryLogsLoading, setQueryLogsLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  
  const isAdmin = profile?.role === 'admin'
  const isEditor = profile?.role === 'editor'

  // Reset về trang 1 khi search hoặc filter thay đổi
  useEffect(() => {
    setLawsPage(1)
  }, [searchTerm, filterLoaiVanBan])

  useEffect(() => {
    // Load song song để tăng tốc độ
    const loadInitialData = async () => {
      // Load stats và laws song song (quan trọng nhất cho dashboard)
      await Promise.all([
        fetchStats(),
    fetchLaws()
      ])
      
      // Load query logs sau (ít quan trọng hơn)
    fetchQueryLogs()
    }
    
    loadInitialData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLaws = async () => {
    try {
      setLawsLoading(true)
      
      // Kiểm tra session trước
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error(`Lỗi xác thực: ${sessionError.message}`)
      }

      if (!session) {
        console.warn('No active session')
        toast({
          title: 'Cảnh báo',
          description: 'Bạn cần đăng nhập để xem văn bản pháp luật',
          variant: 'destructive',
        })
        return
      }

      // Fetch tất cả laws với count để biết tổng số
      const { data, error, count } = await supabase
        .from('laws')
        .select('id, _id, category, link, loai_van_ban, ngay_ban_hanh, ngay_hieu_luc, so_hieu, tinh_trang, title, tom_tat, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Lỗi truy vấn: ${error.message || 'Unknown error'}`)
      }

      // Thêm các field thiếu (noi_dung, noi_dung_html, embedding) với giá trị null để match với Law interface
      const lawsWithNullFields: Law[] = (data || []).map((law: any) => ({
        ...law,
        noi_dung: null,
        noi_dung_html: null,
        embedding: null
      }))

      setLaws(lawsWithNullFields)
      setTotalLaws(count || 0)
    } catch (error: any) {
      console.error('Error fetching laws:', error)
      const errorMessage = error?.message || error?.toString() || 'Không thể tải danh sách văn bản pháp luật'
      
      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLawsLoading(false)
    }
  }

  // Fetch chi tiết law khi mở dialog (để lấy noi_dung và noi_dung_html)
  const fetchLawDetail = async (lawId: number) => {
    try {
      setLoadingLawDetail(true)
      const { data, error } = await supabase
        .from('laws')
        .select('*')
        .eq('id', lawId)
        .single()

      if (error) throw error
      if (data) {
        setSelectedLaw(data)
      }
    } catch (error: any) {
      console.error('Error fetching law detail:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải chi tiết văn bản',
        variant: 'destructive',
      })
    } finally {
      setLoadingLawDetail(false)
    }
  }

  const fetchQueryLogs = async () => {
    try {
      setQueryLogsLoading(true)
      
      // Chỉ select các field cần thiết, giảm limit
      const { data, error } = await supabase
        .from('query_logs')
        .select('id, user_id, query, created_at')
        .order('created_at', { ascending: false })
        .limit(30) // Giảm từ 50 xuống 30

      if (error) throw error
      // Map data để match với QueryLogWithProfile interface
      const mappedLogs: QueryLogWithProfile[] = (data || []).map((log: any) => ({
        ...log,
        matched_ids: log.matched_ids || null,
        response: log.response || null
      }))
      setQueryLogs(mappedLogs)
    } catch (error) {
      console.error('Error fetching query logs:', error)
    } finally {
      setQueryLogsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      
      // Cache stats trong 30 giây để tránh query liên tục
      const cacheKey = 'dashboard_stats_cache'
      const cached = sessionStorage.getItem(cacheKey)
      const now = Date.now()
      
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        if (now - timestamp < 30000) { // 30 giây cache
          setStats(cachedData)
          setStatsLoading(false)
          return
        }
      }
      
      // Tính toán ngày 7 ngày trước
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoISO = sevenDaysAgo.toISOString()
      
      // Fetch stats song song
      const [lawsCount, queriesCount, recentQueriesCount] = await Promise.all([
        supabase
          .from('laws')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('query_logs')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('query_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgoISO)
      ])
      
      const statsData = {
        totalLaws: lawsCount.count || 0,
        totalQueries: queriesCount.count || 0,
        recentQueries: recentQueriesCount.count || 0
      }
      
      setStats(statsData)
      
      // Cache lại
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: statsData,
        timestamp: now
      }))
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thống kê',
        variant: 'destructive',
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const deleteLaw = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa văn bản này?')) return

    try {
      const { error } = await supabase
        .from('laws')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Thành công',
        description: 'Đã xóa văn bản pháp luật',
      })

      fetchLaws()
      fetchStats()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa văn bản pháp luật',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Chào mừng đến với Admin Panel</h2>
            <p className="text-blue-100">Quản lý hệ thống chatbot pháp luật một cách hiệu quả</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.totalLaws}</div>
            <div className="text-blue-100">Văn bản pháp luật</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Tổng văn bản</p>
                <p className="text-2xl font-bold text-green-700">
                  {statsLoading ? '...' : stats.totalLaws.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-green-500 mt-1">Văn bản pháp luật</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Tổng truy vấn</p>
                <p className="text-2xl font-bold text-blue-700">
                  {statsLoading ? '...' : stats.totalQueries.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-blue-500 mt-1">Câu hỏi đã xử lý</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Truy vấn gần đây</p>
                <p className="text-2xl font-bold text-purple-700">
                  {statsLoading ? '...' : stats.recentQueries.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-purple-500 mt-1">Trong 7 ngày qua</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-4'} bg-white shadow-sm`}>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Upload className="h-4 w-4 mr-2" />
            Văn Bản Pháp Luật
          </TabsTrigger>
          <TabsTrigger value="queries" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            Lịch sử truy vấn
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Thống kê
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="system" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Database className="h-4 w-4 mr-2" />
                Quản trị hệ thống
              </TabsTrigger>
              <TabsTrigger value="backup" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Database className="h-4 w-4 mr-2" />
                Backup
              </TabsTrigger>
            </>
          )}
        </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <AdminDashboard />
      </TabsContent>

      <TabsContent value="upload" className="space-y-4">
        <LawUpload />
        
        <div className="border-t pt-4 mt-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <FileText className="h-6 w-6" />
              <span>Danh sách Văn bản Pháp luật</span>
              <Badge variant="secondary" className="ml-auto">
                {(() => {
                  const filtered = laws.filter(law => {
                    const matchesSearch = !searchTerm || 
                      (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                    
                    const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                    
                    return matchesSearch && matchesFilter
                  })
                  
                  if (searchTerm || filterLoaiVanBan !== 'all') {
                    return `${filtered.length} / ${totalLaws} văn bản`
                  }
                  return `${totalLaws} văn bản`
                })()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-green-600">
              Quản lý và theo dõi các văn bản pháp luật trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Section */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tiêu đề, số hiệu, người ký..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filter by Loại văn bản */}
                <div className="w-full sm:w-64">
                  <Select value={filterLoaiVanBan} onValueChange={setFilterLoaiVanBan}>
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tất cả loại văn bản" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả loại văn bản</SelectItem>
                      {Array.from(new Set(laws.map(l => l.loai_van_ban).filter(Boolean))).sort().map((loai) => (
                        <SelectItem key={loai} value={loai || ''}>
                          {loai}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Clear Filters Button */}
                {(searchTerm || filterLoaiVanBan !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterLoaiVanBan('all')
                    }}
                    className="whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
              
              {/* Results Count */}
              {(() => {
                const filtered = laws.filter(law => {
                  const matchesSearch = !searchTerm || 
                    (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                  
                  const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                  
                  return matchesSearch && matchesFilter
                })
                
                return (
                  <div className="text-sm text-gray-600">
                    Hiển thị {filtered.length} / {totalLaws} văn bản
                    {(searchTerm || filterLoaiVanBan !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('')
                          setFilterLoaiVanBan('all')
                        }}
                        className="ml-2 h-auto p-0 text-blue-600 hover:text-blue-700"
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                )
              })()}
            </div>
          </CardContent>
          
          <CardContent className="p-0 border-t">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {(() => {
                  // Filter laws based on search and filter
                  const filteredLaws = laws.filter(law => {
                    const matchesSearch = !searchTerm || 
                      (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                    
                    const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                    
                    return matchesSearch && matchesFilter
                  })
                  
                  // Nếu chưa có văn bản nào
                  if (laws.length === 0) {
                    return (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có văn bản nào</h3>
                    <p className="text-gray-500 mb-4">Hãy upload văn bản pháp luật đầu tiên của bạn</p>
                  </div>
                    )
                  }
                  
                  // Nếu không tìm thấy sau khi filter
                  if (filteredLaws.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy văn bản nào</h3>
                        <p className="text-gray-500 mb-4">
                          Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm('')
                            setFilterLoaiVanBan('all')
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Xóa bộ lọc
                        </Button>
                      </div>
                    )
                  }
                  
                  // Tính toán phân trang
                  const totalPages = Math.ceil(filteredLaws.length / lawsPerPage)
                  const startIndex = (lawsPage - 1) * lawsPerPage
                  const endIndex = startIndex + lawsPerPage
                  const paginatedLaws = filteredLaws.slice(startIndex, endIndex)
                  
                  // Hiển thị danh sách đã filter và phân trang
                  return (
                    <>
                      {paginatedLaws.map((law) => (
                    <div 
                      key={law.id} 
                      className="group border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedLaw(law)
                        setIsViewDialogOpen(true)
                        // Fetch chi tiết để lấy noi_dung và noi_dung_html
                        fetchLawDetail(law.id)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {law.title || law.so_hieu || 'Văn bản pháp luật'}
                            </h4>
                            {law.category && (
                              <Badge variant="secondary" className="text-xs">
                                {law.category}
                              </Badge>
                            )}
                            {law.loai_van_ban && (
                              <Badge variant="outline" className="text-xs">
                                {law.loai_van_ban}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <div className="flex flex-wrap items-center gap-3">
                              {law.so_hieu && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <span>Số hiệu: {law.so_hieu}</span>
                                </span>
                              )}
                              {law.ngay_ban_hanh && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  <span>BH: {law.ngay_ban_hanh}</span>
                                </span>
                              )}
                              {law.ngay_hieu_luc && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                  <span>HL: {law.ngay_hieu_luc}</span>
                                </span>
                              )}
                              {law.tinh_trang && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  <span>{law.tinh_trang}</span>
                                </span>
                              )}
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span>{new Date(law.created_at).toLocaleDateString('vi-VN')}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation() // Ngăn event bubble lên card
                              setSelectedLaw(law)
                              setIsViewDialogOpen(true)
                              // Fetch chi tiết để lấy noi_dung và noi_dung_html
                              fetchLawDetail(law.id)
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="text-xs">Xem</span>
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation() // Ngăn event bubble lên card
                                deleteLaw(law.id)
                              }}
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              title="Xóa văn bản"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                    </>
                  )
                })()}
              </div>
            </ScrollArea>
            
            {/* Pagination Controls - Outside ScrollArea để luôn hiển thị */}
            {(() => {
              const filteredLaws = laws.filter(law => {
                const matchesSearch = !searchTerm || 
                  (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                
                const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                
                return matchesSearch && matchesFilter
              })
              
              const totalPages = Math.ceil(filteredLaws.length / lawsPerPage)
              
              if (totalPages <= 1 || filteredLaws.length === 0) return null
              
              return (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Trang {lawsPage} / {totalPages} ({filteredLaws.length} văn bản)
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
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          
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
                              className={lawsPage === pageNum ? "bg-blue-600 text-white" : ""}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLawsPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={lawsPage === totalPages}
                        className="flex items-center space-x-1"
                      >
                        <span>Sau</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
        </div>
      </TabsContent>

      <TabsContent value="laws" className="space-y-4">
        <LawUpload />
        
        <div className="border-t pt-4 mt-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <FileText className="h-6 w-6" />
              <span>Danh sách Văn bản Pháp luật</span>
              <Badge variant="secondary" className="ml-auto">
                {(() => {
                  const filtered = laws.filter(law => {
                    const matchesSearch = !searchTerm || 
                      (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                    
                    const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                    
                    return matchesSearch && matchesFilter
                  })
                  
                  if (searchTerm || filterLoaiVanBan !== 'all') {
                    return `${filtered.length} / ${laws.length} văn bản`
                  }
                  return `${laws.length} văn bản${laws.length >= 200 ? '+' : ''}`
                })()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-green-600">
              Quản lý và theo dõi các văn bản pháp luật trong hệ thống
              {laws.length >= 200 && (
                <span className="text-blue-600 ml-2">(Đang hiển thị 200 văn bản đầu tiên)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Section */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tiêu đề, số hiệu, người ký..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filter by Loại văn bản */}
                <div className="w-full sm:w-64">
                  <Select value={filterLoaiVanBan} onValueChange={setFilterLoaiVanBan}>
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tất cả loại văn bản" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả loại văn bản</SelectItem>
                      {Array.from(new Set(laws.map(l => l.loai_van_ban).filter(Boolean))).sort().map((loai) => (
                        <SelectItem key={loai} value={loai || ''}>
                          {loai}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Clear Filters Button */}
                {(searchTerm || filterLoaiVanBan !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterLoaiVanBan('all')
                    }}
                    className="whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
              
              {/* Results Count */}
              {(() => {
                const filtered = laws.filter(law => {
                  const matchesSearch = !searchTerm || 
                    (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                  
                  const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                  
                  return matchesSearch && matchesFilter
                })
                
                return (
                  <div className="text-sm text-gray-600">
                    Hiển thị {filtered.length} / {laws.length} văn bản
                    {(searchTerm || filterLoaiVanBan !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchTerm('')
                          setFilterLoaiVanBan('all')
                        }}
                        className="ml-2 h-auto p-0 text-blue-600 hover:text-blue-700"
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                )
              })()}
            </div>
          </CardContent>
          
          <CardContent className="p-0 border-t">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {(() => {
                  // Filter laws based on search and filter
                  const filteredLaws = laws.filter(law => {
                    const matchesSearch = !searchTerm || 
                      (law.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.so_hieu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.nguoi_ky || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (law.noi_ban_hanh || '').toLowerCase().includes(searchTerm.toLowerCase())
                    
                    const matchesFilter = filterLoaiVanBan === 'all' || law.loai_van_ban === filterLoaiVanBan
                    
                    return matchesSearch && matchesFilter
                  })
                  
                  // Nếu chưa có văn bản nào
                  if (laws.length === 0) {
                    return (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có văn bản nào</h3>
                    <p className="text-gray-500 mb-4">Hãy upload văn bản pháp luật đầu tiên của bạn</p>
                    <Button onClick={() => setActiveTab('upload')} className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload văn bản
                    </Button>
                  </div>
                    )
                  }
                  
                  // Nếu không tìm thấy sau khi filter
                  if (filteredLaws.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy văn bản nào</h3>
                        <p className="text-gray-500 mb-4">
                          Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm('')
                            setFilterLoaiVanBan('all')
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Xóa bộ lọc
                        </Button>
                      </div>
                    )
                  }
                  
                  // Hiển thị danh sách đã filter
                  return filteredLaws.map((law) => (
                    <div 
                      key={law.id} 
                      className="group border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedLaw(law)
                        setIsViewDialogOpen(true)
                        // Fetch chi tiết để lấy noi_dung và noi_dung_html
                        fetchLawDetail(law.id)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {law.title || law.so_hieu || 'Văn bản pháp luật'}
                            </h4>
                            {law.category && (
                              <Badge variant="secondary" className="text-xs">
                                {law.category}
                              </Badge>
                            )}
                            {law.loai_van_ban && (
                              <Badge variant="outline" className="text-xs">
                                {law.loai_van_ban}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            <div className="flex flex-wrap items-center gap-3">
                              {law.so_hieu && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <span>Số hiệu: {law.so_hieu}</span>
                                </span>
                              )}
                              {law.ngay_ban_hanh && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  <span>BH: {law.ngay_ban_hanh}</span>
                                </span>
                              )}
                              {law.ngay_hieu_luc && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                  <span>HL: {law.ngay_hieu_luc}</span>
                                </span>
                              )}
                              {law.tinh_trang && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  <span>{law.tinh_trang}</span>
                                </span>
                              )}
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span>{new Date(law.created_at).toLocaleDateString('vi-VN')}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation() // Ngăn event bubble lên card
                              setSelectedLaw(law)
                              setIsViewDialogOpen(true)
                              // Fetch chi tiết để lấy noi_dung và noi_dung_html
                              fetchLawDetail(law.id)
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="text-xs">Xem</span>
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation() // Ngăn event bubble lên card
                                deleteLaw(law.id)
                              }}
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              title="Xóa văn bản"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        </div>
      </TabsContent>

      <TabsContent value="queries" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Lịch sử Truy vấn</span>
            </CardTitle>
            <CardDescription>
              Theo dõi các câu hỏi của người dùng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {queryLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{log.query}</p>
                        <p className="text-sm text-gray-600">
                          Người dùng: {log.profiles?.full_name || 'Không xác định'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {log.matched_ids?.length || 0} kết quả
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stats" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng văn bản</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLaws}</div>
              <p className="text-xs text-muted-foreground">
                Văn bản pháp luật
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng truy vấn</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQueries}</div>
              <p className="text-xs text-muted-foreground">
                Câu hỏi đã xử lý
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Truy vấn gần đây</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentQueries}</div>
              <p className="text-xs text-muted-foreground">
                Trong 7 ngày qua
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {isAdmin && (
        <>
          <TabsContent value="system" className="space-y-4">
            <SystemManagement />
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <BackupStatus />
          </TabsContent>
        </>
      )}
      </Tabs>

      {/* Dialog xem chi tiết văn bản */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedLaw?.title || selectedLaw?.so_hieu || 'Chi tiết văn bản pháp luật'}
            </DialogTitle>
            {selectedLaw?.so_hieu && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">Số hiệu: {selectedLaw.so_hieu}</Badge>
                {selectedLaw.loai_van_ban && (
                  <Badge variant="secondary">{selectedLaw.loai_van_ban}</Badge>
                )}
                {selectedLaw.category && (
                  <Badge>{selectedLaw.category}</Badge>
                )}
              </div>
            )}
          </DialogHeader>
          
          {selectedLaw && (
            <div className="space-y-4 mt-4">
              {/* Thông tin chi tiết */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                {selectedLaw.ngay_ban_hanh && (
                  <div>
                    <p className="text-xs text-gray-500">Ngày ban hành</p>
                    <p className="font-medium">{selectedLaw.ngay_ban_hanh}</p>
                  </div>
                )}
                {selectedLaw.ngay_hieu_luc && (
                  <div>
                    <p className="text-xs text-gray-500">Ngày hiệu lực</p>
                    <p className="font-medium">{selectedLaw.ngay_hieu_luc}</p>
                  </div>
                )}
                {selectedLaw.ngay_cong_bao && (
                  <div>
                    <p className="text-xs text-gray-500">Ngày công báo</p>
                    <p className="font-medium">{selectedLaw.ngay_cong_bao}</p>
                  </div>
                )}
                {selectedLaw.tinh_trang && (
                  <div>
                    <p className="text-xs text-gray-500">Tình trạng</p>
                    <p className="font-medium">{selectedLaw.tinh_trang}</p>
                  </div>
                )}
                {selectedLaw.nguoi_ky && (
                  <div>
                    <p className="text-xs text-gray-500">Người ký</p>
                    <p className="font-medium">{selectedLaw.nguoi_ky}</p>
                  </div>
                )}
                {selectedLaw.noi_ban_hanh && (
                  <div>
                    <p className="text-xs text-gray-500">Nơi ban hành</p>
                    <p className="font-medium">{selectedLaw.noi_ban_hanh}</p>
                  </div>
                )}
              </div>

              {/* Tóm tắt */}
              {selectedLaw.tom_tat && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Tóm tắt</h3>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {selectedLaw.tom_tat.replace(/<[^>]+>/g, '').replace(/<jsontable[^>]*>.*?<\/jsontable>/gi, '')}
                  </p>
                </div>
              )}

              {/* Nội dung HTML */}
              {selectedLaw.noi_dung_html && (
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-semibold mb-3">Nội dung</h3>
                  <div 
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedLaw.noi_dung_html
                        .replace(/<jsontable[^>]*>.*?<\/jsontable>/gi, '')
                        .replace(/<json[^>]*>.*?<\/json>/gi, '')
                    }} 
                  />
                </div>
              )}

              {/* Nội dung plain text */}
              {!selectedLaw.noi_dung_html && selectedLaw.noi_dung && (
                <div className="p-4 bg-white rounded-lg border">
                  <h3 className="font-semibold mb-3">Nội dung</h3>
                  <div className="text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {selectedLaw.noi_dung
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/<jsontable[^>]*>.*?<\/jsontable>/gi, '')
                      .replace(/<json[^>]*>.*?<\/json>/gi, '')
                      .replace(/\s+/g, ' ')
                      .trim()}
                  </div>
                </div>
              )}

              {/* Link */}
              {selectedLaw.link && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Link tham khảo</p>
                  <a 
                    href={selectedLaw.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {selectedLaw.link}
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
