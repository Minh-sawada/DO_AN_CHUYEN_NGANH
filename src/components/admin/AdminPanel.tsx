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
  Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Law } from '@/lib/supabase'
import { AdminDashboard } from './AdminDashboard'
import { TestUpload } from './TestUpload'
import { TestDatabase } from './TestDatabase'
import { TestUploadSimple } from './TestUploadSimple'

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
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [laws, setLaws] = useState<Law[]>([])
  const [queryLogs, setQueryLogs] = useState<QueryLogWithProfile[]>([])
  const [stats, setStats] = useState({
    totalLaws: 0,
    totalQueries: 0,
    recentQueries: 0
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState('')
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [loadingLawDetail, setLoadingLawDetail] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLoaiVanBan, setFilterLoaiVanBan] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchLaws()
    fetchQueryLogs()
    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLaws = async () => {
    try {
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

      // CHỈ select các cột cần thiết, KHÔNG select noi_dung và noi_dung_html (quá lớn, gây timeout)
      const { data, error } = await supabase
        .from('laws')
        .select('id, _id, category, danh_sach_bang, link, loai_van_ban, ngay_ban_hanh, ngay_cong_bao, ngay_hieu_luc, nguoi_ky, noi_ban_hanh, so_cong_bao, so_hieu, thuoc_tinh_html, tinh_trang, title, tom_tat, tom_tat_html, van_ban_duoc_dan, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200) // Tăng từ 50 lên 200

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
    } catch (error: any) {
      console.error('Error fetching laws:', error)
      const errorMessage = error?.message || error?.toString() || 'Không thể tải danh sách văn bản pháp luật'
      
      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive',
      })
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
      const { data, error } = await supabase
        .from('query_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setQueryLogs(data || [])
    } catch (error) {
      console.error('Error fetching query logs:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_law_stats')
      if (error) throw error
      if (data && data.length > 0) {
        setStats(data[0])
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Lỗi',
          description: 'File quá lớn. Kích thước tối đa là 10MB',
          variant: 'destructive',
        })
        return
      }

      // Accept all file types - let the API handle the processing
      setSelectedFile(file)
      setFileTitle(file.name.replace(/\.[^/.]+$/, ''))
      
      toast({
        title: 'File đã chọn',
        description: `Đã chọn file: ${file.name}`,
      })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file để upload',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', fileTitle)

      // Gửi đến n8n webhook thay vì API route
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_UPLOAD_WEBHOOK || 'http://localhost:5678/webhook/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }

      const result = await response.json()
      
      setUploadProgress(100)
      
      toast({
        title: 'Thành công',
        description: `Đã upload và xử lý ${result.processedChunks} đoạn văn bản`,
      })

      // Reset form
      setSelectedFile(null)
      setFileTitle('')
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Refresh data
      fetchLaws()
      fetchStats()

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi upload file',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
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
                <p className="text-2xl font-bold text-green-700">{stats.totalLaws}</p>
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
                <p className="text-2xl font-bold text-blue-700">{stats.totalQueries}</p>
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
                <p className="text-2xl font-bold text-purple-700">{stats.recentQueries}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 bg-white shadow-sm">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="test" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Test Upload
          </TabsTrigger>
          <TabsTrigger value="testsimple" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Upload className="h-4 w-4 mr-2" />
            Test Simple
          </TabsTrigger>
          <TabsTrigger value="testdb" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Database className="h-4 w-4 mr-2" />
            Test DB
          </TabsTrigger>
          <TabsTrigger value="laws" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Văn bản pháp luật
          </TabsTrigger>
          <TabsTrigger value="queries" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            Lịch sử truy vấn
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Thống kê
          </TabsTrigger>
        </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <AdminDashboard />
      </TabsContent>

      <TabsContent value="test" className="space-y-4">
        <TestUpload />
      </TabsContent>

      <TabsContent value="testsimple" className="space-y-4">
        <TestUploadSimple />
      </TabsContent>

      <TabsContent value="testdb" className="space-y-4">
        <TestDatabase />
      </TabsContent>

      <TabsContent value="upload" className="space-y-4">
        <Card className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Upload Văn bản Pháp luật</CardTitle>
            <CardDescription>
              Kéo thả file hoặc click để chọn file PDF, Word, Text, hoặc các định dạng khác
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 font-medium hover:text-blue-800">
                      Click để chọn file
                    </span>
                    <span className="text-gray-500"> hoặc kéo thả vào đây</span>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Hỗ trợ: PDF, DOC, DOCX, TXT, RTF, ODT (tối đa 10MB)
                </p>
              </div>
            </div>

            {selectedFile && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="file-title" className="text-base font-medium">Tiêu đề văn bản</Label>
              <Input
                id="file-title"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                placeholder="Nhập tiêu đề cho văn bản pháp luật..."
                disabled={uploading}
                className="text-base"
              />
            </div>

            {uploading && (
              <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-800">Đang xử lý file...</span>
                  <span className="text-blue-600 font-bold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-2" />
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang extract text và tạo embeddings...</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading || !fileTitle.trim()}
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload và Xử lý File
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="laws" className="space-y-4">
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
                              {law.title || 'Untitled'}
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
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
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
      </Tabs>

      {/* Dialog xem chi tiết văn bản */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedLaw?.title || 'Chi tiết văn bản pháp luật'}
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
