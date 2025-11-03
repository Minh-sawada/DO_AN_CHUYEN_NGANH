'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function LawUpload() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [customTitle, setCustomTitle] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase()
      const allowedExtensions = ['.json', '.txt', '.rtf', '.doc', '.docx', '.pdf']
      const isValid = allowedExtensions.some(ext => fileName.endsWith(ext))
      
      if (!isValid) {
        toast({
          title: 'Lỗi',
          description: `Chỉ chấp nhận: ${allowedExtensions.join(', ')}`,
          variant: 'destructive'
        })
        return
      }
      setFile(selectedFile)
      setUploadResult(null)
      // Reset title khi chọn file mới (chỉ nếu là JSON thì giữ nguyên)
      if (!fileName.endsWith('.json')) {
        setCustomTitle('')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file',
        variant: 'destructive'
      })
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Thêm title nếu người dùng nhập
      if (customTitle.trim()) {
        formData.append('title', customTitle.trim())
      }

      // Chọn API endpoint dựa trên loại file
      const fileName = file.name.toLowerCase()
      const isJson = fileName.endsWith('.json')
      const apiEndpoint = isJson ? '/api/laws/upload' : '/api/laws/upload-word'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Upload thất bại')
      }

      setUploadResult(result)
      
      // Toast message khác nhau cho JSON vs Word/DOC/PDF
      const isJsonUpload = result.stats !== undefined
      const toastMessage = isJsonUpload 
        ? `Đã import ${result.stats?.inserted || 0} văn bản thành công`
        : `Đã upload "${result.data?.title || 'file'}" thành công`
      
      toast({
        title: 'Thành công',
        description: toastMessage,
        duration: 5000
      })

      // Reset file và title
      setFile(null)
      setCustomTitle('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Upload thất bại',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadSample = async () => {
    try {
      // Fetch file từ API endpoint để đảm bảo đúng format
      const response = await fetch('/api/laws/sample')
      
      if (!response.ok) {
        throw new Error('Không thể tải file mẫu')
      }

      const text = await response.text()
      
      // Validate JSON trước khi download
      try {
        JSON.parse(text)
      } catch (parseError) {
        throw new Error('File mẫu không hợp lệ. Vui lòng thử lại.')
      }
      
      // Tạo blob từ text để download
      const blob = new Blob([text], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'sample-laws.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Thành công',
        description: 'Đã tải file mẫu thành công. Vui lòng mở file và kiểm tra trước khi upload.'
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải file mẫu: ' + error.message,
        variant: 'destructive'
      })
    }
  }

  const handleDownloadSampleTxt = async () => {
    try {
      // Download file TXT mẫu từ public folder
      const response = await fetch('/sample-law-document.txt')
      
      if (!response.ok) {
        throw new Error('Không thể tải file mẫu')
      }

      const text = await response.text()
      
      // Tạo blob từ text để download
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'sample-law-document.txt'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Thành công',
        description: 'Đã tải file TXT mẫu thành công. Bạn có thể upload file này để test.'
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải file mẫu: ' + error.message,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload File Luật</span>
          </CardTitle>
          <CardDescription>
            Upload file JSON hoặc Word/DOC/TXT để cập nhật văn bản pháp luật vào hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hướng dẫn */}
          <Alert className="bg-blue-50 border-blue-200">
            <FileText className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-blue-900">✅ Không cần N8N - Upload trực tiếp vào database</p>
                <p className="text-sm text-blue-700">Upload file JSON hoặc Word/DOC/TXT trực tiếp vào Supabase.</p>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">Định dạng hỗ trợ:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                    <div>
                      <p className="font-medium">📄 JSON (.json)</p>
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li>File array hoặc object có key &quot;laws&quot;</li>
                        <li>Cần có <code className="bg-blue-100 px-1 rounded">title</code> hoặc <code className="bg-blue-100 px-1 rounded">so_hieu</code></li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">📝 Word/DOC/PDF (.txt, .rtf, .docx, .pdf)</p>
                      <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                        <li>Tự động extract text từ file</li>
                        <li>DOCX và PDF được hỗ trợ</li>
                        <li>DOC (Word 2003) cần chuyển sang DOCX</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSample}
                    className="flex items-center space-x-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download file JSON mẫu</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSampleTxt}
                    className="flex items-center space-x-2 border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download file TXT mẫu (văn bản pháp luật)</span>
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* File input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Chọn file (JSON, TXT, RTF, DOC, DOCX, PDF)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".json,.txt,.rtf,.doc,.docx,.pdf"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="flex-1"
                />
              </div>
            </div>
            
            {/* Title input (tùy chọn, chỉ cho Word/DOC/PDF) */}
            {file && !file.name.toLowerCase().endsWith('.json') && (
              <div className="space-y-2">
                <Label htmlFor="custom-title">
                  Tiêu đề (tùy chọn) - Nếu để trống sẽ tự động lấy từ file
                </Label>
                <Input
                  id="custom-title"
                  type="text"
                  placeholder="Nhập tiêu đề văn bản..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500">
                  💡 Nếu không nhập, hệ thống sẽ tự động lấy từ nội dung file hoặc tên file
                </p>
              </div>
            )}
            
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center space-x-2 w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang upload...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </>
              )}
            </Button>
            
            {/* File preview */}
            {file && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setCustomTitle('')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Kết quả upload */}
          {uploadResult && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Upload thành công!</h3>
                  </div>
                  
                  {/* Hiển thị kết quả cho JSON upload (có stats) */}
                  {uploadResult.stats ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Tổng số:</span>
                          <p className="font-medium">{uploadResult.stats.total || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Đã validate:</span>
                          <p className="font-medium">{uploadResult.stats.validated || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Đã import:</span>
                          <p className="font-medium text-green-600">{uploadResult.stats.inserted || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Thất bại:</span>
                          <p className={`font-medium ${(uploadResult.stats.failed || 0) > 0 ? 'text-red-600' : ''}`}>
                            {uploadResult.stats.failed || 0}
                          </p>
                        </div>
                      </div>
                      {uploadResult.stats.errors && uploadResult.stats.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                          <p className="text-sm font-medium text-red-800 mb-2">Lỗi:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
                            {uploadResult.stats.errors.map((error: string, index: number) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Hiển thị kết quả cho Word/DOC/PDF upload (có data) */
                    uploadResult.data && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Tiêu đề:</span>
                          <p className="font-medium">{uploadResult.data.title || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">ID:</span>
                          <p className="font-medium">{uploadResult.data.id || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Độ dài text:</span>
                          <p className="font-medium text-green-600">
                            {uploadResult.data.text_length 
                              ? `${(uploadResult.data.text_length / 1024).toFixed(2)} KB`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Loại upload:</span>
                          <p className="font-medium">File văn bản</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

