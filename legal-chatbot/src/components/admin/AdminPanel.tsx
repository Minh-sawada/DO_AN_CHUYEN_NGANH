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
import { useToast } from '@/hooks/use-toast'
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Loader2,
  Trash2,
  Activity,
  CheckCircle,
  TrendingUp,
  Globe,
  Search,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Law } from '@/lib/supabase'
import { AdminDashboard } from './AdminDashboard'

interface QueryLogWithProfile {
  id: number
  user_id: string | null
  query: string
  matched_ids: number[] | null
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
  const [govSearchTerm, setGovSearchTerm] = useState('')
  const [scrapingGov, setScrapingGov] = useState(false)
  const [laws, setLaws] = useState<Law[]>([])
  const [queryLogs, setQueryLogs] = useState<QueryLogWithProfile[]>([])
  const [stats, setStats] = useState({
    totalLaws: 22, // Set initial value based on actual data
    totalQueries: 0,
    recentQueries: 0
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      await fetchLaws()
      await fetchQueryLogs()
      fetchStats()
    }
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update stats when laws or queryLogs change
  useEffect(() => {
    const newStats = {
      totalLaws: laws.length,
      totalQueries: queryLogs.length,
      recentQueries: queryLogs.filter(log => {
        const logDate = new Date(log.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return logDate >= weekAgo
      }).length
    }
    console.log('Updating stats:', newStats)
    setStats(newStats)
  }, [laws, queryLogs])

  const fetchLaws = async () => {
    try {
      const { data, error } = await supabase
        .from('laws')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setLaws(data || [])
      console.log('Fetched laws:', data?.length || 0)
    } catch (error) {
      console.error('Error fetching laws:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách văn bản pháp luật',
        variant: 'destructive',
      })
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
      console.log('Fetched query logs:', data?.length || 0)
    } catch (error) {
      console.error('Error fetching query logs:', error)
    }
  }

  const fetchStats = () => {
    // Calculate stats from local data
    const calculatedStats = {
      totalLaws: laws.length,
      totalQueries: queryLogs.length,
      recentQueries: queryLogs.filter(log => {
        const logDate = new Date(log.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return logDate >= weekAgo
      }).length
    }
    setStats(calculatedStats)
    console.log('Stats calculated from local data:', calculatedStats)
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

      // Gửi đến API route trực tiếp (tạm thời thay thế n8n)
      const uploadUrl = '/api/upload-test'
      console.log('Upload API URL:', uploadUrl)
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Upload failed: ${response.status}`)
      }

      // Parse JSON response từ API route
      const result = await response.json()
      console.log('Upload result:', result)
      
      setUploadProgress(100)
      
      toast({
        title: 'Thành công',
        description: `Đã upload và xử lý ${result.processedChunks} đoạn văn bản thành công`,
      })

      // Reset form
      setSelectedFile(null)
      setFileTitle('')
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Refresh data
      await fetchLaws()
      await fetchQueryLogs()
      // Stats will auto-update via useEffect

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

      await fetchLaws()
      await fetchQueryLogs()
      // Stats will auto-update via useEffect
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa văn bản pháp luật',
        variant: 'destructive',
      })
    }
  }

  const scrapeGovDocuments = async () => {
    if (!govSearchTerm.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập từ khóa tìm kiếm',
        variant: 'destructive',
      })
      return
    }

    setScrapingGov(true)

    try {
      const response = await fetch('/api/scrape-gov-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: govSearchTerm,
          limit: 10
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Scraping failed: ${response.status}`)
      }

      const data = await response.json()

      toast({
        title: 'Thành công',
        description: data.message,
      })

      // Refresh data
      await fetchLaws()
      await fetchQueryLogs()
      // Stats will auto-update via useEffect

    } catch (error) {
      console.error('Scraping error:', error)
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lấy dữ liệu từ chính phủ',
        variant: 'destructive',
      })
    } finally {
      setScrapingGov(false)
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
          <TabsTrigger value="gov-data" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Globe className="h-4 w-4 mr-2" />
            Dữ liệu Chính phủ
          </TabsTrigger>
        </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <AdminDashboard />
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
                {laws.length} văn bản
              </Badge>
            </CardTitle>
            <CardDescription className="text-green-600">
              Quản lý và theo dõi các văn bản pháp luật trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-3">
                {laws.length === 0 ? (
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
                ) : (
                  laws.map((law) => (
                    <div key={law.id} className="group border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {law.title || 'Không có tiêu đề'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {law.article_reference || 'Không có điều/khoản'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-13 space-y-2">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>{law.content.length.toLocaleString()} ký tự</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span>{new Date(law.created_at).toLocaleDateString('vi-VN')}</span>
                              </span>
                              {law.source && (
                                <span className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                  <span className="truncate max-w-32">{law.source}</span>
                                </span>
                              )}
                            </div>
                            
                            <div className="bg-gray-50 rounded p-3 mt-3">
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {law.content.substring(0, 150)}...
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteLaw(law.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Tổng văn bản</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.totalLaws}</div>
              <p className="text-xs text-blue-600 mt-1">
                Văn bản pháp luật trong hệ thống
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Tổng truy vấn</CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.totalQueries}</div>
              <p className="text-xs text-green-600 mt-1">
                Câu hỏi đã được xử lý
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Truy vấn gần đây</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.recentQueries}</div>
              <p className="text-xs text-purple-600 mt-1">
                Trong 7 ngày qua
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Trạng thái hệ thống</CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <Activity className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-orange-900">Hoạt động bình thường</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Tất cả dịch vụ đang chạy
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="gov-data" className="space-y-4">
        <Card className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Lấy Dữ liệu từ Chính phủ</CardTitle>
            <CardDescription>
              Tìm kiếm và lấy văn bản pháp luật từ Cổng thông tin điện tử Chính phủ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gov-search" className="text-base font-medium">Từ khóa tìm kiếm</Label>
                <div className="flex gap-2">
                  <Input
                    id="gov-search"
                    value={govSearchTerm}
                    onChange={(e) => setGovSearchTerm(e.target.value)}
                    placeholder="Ví dụ: ngân hàng, tín dụng, bảo hiểm..."
                    disabled={scrapingGov}
                    className="text-base"
                  />
                  <Button 
                    onClick={scrapeGovDocuments}
                    disabled={scrapingGov || !govSearchTerm.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {scrapingGov ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tìm...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Tìm kiếm
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Các lĩnh vực có sẵn:</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Tài chính - Ngân hàng',
                    'Luật',
                    'Thủ tục hành chính', 
                    'Doanh nghiệp',
                    'Lao động - Tiền lương',
                    'Đất đai - Nhà ở',
                    'Thuế - Lệ phí',
                    'Thương mại'
                  ].map((category) => (
                    <Badge 
                      key={category}
                      variant="secondary" 
                      className="cursor-pointer hover:bg-blue-200"
                      onClick={() => setGovSearchTerm(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {scrapingGov && (
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-800">Đang tìm kiếm văn bản...</span>
                    <span className="text-blue-600 font-bold">Đang xử lý</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang kết nối với Cổng thông tin điện tử Chính phủ...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Lưu ý quan trọng:</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Tính năng này sẽ tìm kiếm và lấy văn bản pháp luật từ 
                    <a href="https://vanban.chinhphu.vn/" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                      Cổng thông tin điện tử Chính phủ
                    </a> để bổ sung vào cơ sở dữ liệu của hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  )
}
