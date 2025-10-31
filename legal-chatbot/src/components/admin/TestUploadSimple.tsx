'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react'

export function TestUploadSimple() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
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
    if (!fileTitle.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tiêu đề cho văn bản',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', fileTitle)

      console.log('Uploading to /api/upload-simple...')

      const response = await fetch('/api/upload-simple', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const data = await response.json()
      console.log('Response data:', data)

      setResult(data)

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: `Đã upload và xử lý ${data.processedChunks} đoạn văn bản (không có embedding)`,
        })
        setSelectedFile(null)
        setFileTitle('')
      } else {
        toast({
          title: 'Lỗi upload',
          description: data.error || 'Có lỗi xảy ra khi upload file.',
          variant: 'destructive',
        })
      }

    } catch (error) {
      console.error('Upload error:', error)
      setResult({
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
      toast({
        title: 'Lỗi',
        description: 'Không thể kết nối đến server',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Test Upload Simple (No OpenAI)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Upload file đơn giản không cần OpenAI API (chỉ lưu text, không tạo embedding).
        </p>

        <div className="space-y-2">
          <Label htmlFor="file-upload-simple">Chọn file</Label>
          <Input
            id="file-upload-simple"
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-title-simple">Tiêu đề văn bản</Label>
          <Input
            id="file-title-simple"
            value={fileTitle}
            onChange={(e) => setFileTitle(e.target.value)}
            placeholder="Nhập tiêu đề cho văn bản pháp luật..."
            disabled={uploading}
          />
        </div>

        {selectedFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || uploading || !fileTitle.trim()}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang upload...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Simple
            </>
          )}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.error 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {result.error ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <h3 className={`font-semibold ${
                result.error ? 'text-red-800' : 'text-green-800'
              }`}>
                {result.error ? 'Upload Failed' : 'Upload Success'}
              </h3>
            </div>
            
            <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
