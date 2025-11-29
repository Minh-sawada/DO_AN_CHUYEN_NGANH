'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  extractedText: string
}

interface SimpleFileUploadProps {
  onFileProcessed: (file: UploadedFile) => void
  disabled?: boolean
  maxSize?: number
}

const SUPPORTED_TYPES = {
  'image/jpeg': { icon: ImageIcon, label: 'JPEG' },
  'image/jpg': { icon: ImageIcon, label: 'JPG' },
  'image/png': { icon: ImageIcon, label: 'PNG' },
  'image/webp': { icon: ImageIcon, label: 'WebP' },
  'application/pdf': { icon: FileText, label: 'PDF' },
  'text/plain': { icon: File, label: 'TXT' }
}

export function SimpleFileUpload({ 
  onFileProcessed, 
  disabled = false,
  maxSize = 10 * 1024 * 1024
}: SimpleFileUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    const typeInfo = SUPPORTED_TYPES[fileType as keyof typeof SUPPORTED_TYPES]
    const Icon = typeInfo?.icon || File
    return <Icon className="h-4 w-4" />
  }

  const validateFile = (file: File): string | null => {
    if (!Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return `Unsupported file type: ${file.type}. Supported: ${Object.keys(SUPPORTED_TYPES).join(', ')}`
    }

    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`
    }

    return null
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      toast({
        title: 'File validation error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setCurrentFile(file)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 20
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/chat/upload-file', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      
      const processedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        extractedText: data.extractedText
      }

      onFileProcessed(processedFile)

      toast({
        title: 'File processed successfully',
        description: `${file.name} has been processed`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process file',
        variant: 'destructive'
      })
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setCurrentFile(null)
      }, 1000)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={Object.keys(SUPPORTED_TYPES).join(',')}
          className="hidden"
          disabled={isUploading || disabled}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="h-8 px-3"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4 mr-1.5" />
          )}
          {isUploading ? 'Processing...' : 'Attach File'}
        </Button>

        <span className="text-xs text-gray-500">
          Images, PDF, TXT (Max {formatFileSize(maxSize)})
        </span>
      </div>

      {isUploading && currentFile && (
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              {getFileIcon(currentFile.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentFile.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {formatFileSize(currentFile.size)}
                  </span>
                  <span className="text-xs text-blue-600">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-1 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
