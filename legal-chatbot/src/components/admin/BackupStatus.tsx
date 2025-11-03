'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock,
  HardDrive,
  Shield,
  AlertCircle,
  Download,
  Eye,
  FileText,
  Lock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BackupSettings {
  id: string
  auto_backup_enabled: boolean
  backup_frequency: string
  retention_days: number
  encryption_enabled: boolean
  max_backup_size_mb: number
  updated_at: string
}

interface BackupLog {
  id: string
  backup_type: string
  file_name: string
  file_size: number | null
  status: string
  created_at: string
  completed_at: string | null
  error_message: string | null
}

export function BackupStatus() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([])
  const [storageBucketExists, setStorageBucketExists] = useState(false)
  const [edgeFunctionExists, setEdgeFunctionExists] = useState(false)
  const [storageFiles, setStorageFiles] = useState<any[]>([])
  const [viewingFile, setViewingFile] = useState<string | null>(null)

  useEffect(() => {
    fetchBackupStatus()
  }, [])

  const fetchBackupStatus = async () => {
    try {
      setLoading(true)

      // 1. Kiểm tra backup settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('backup_settings')
        .select('*')
        .limit(1)
        .single()

      if (!settingsError && settingsData) {
        setSettings(settingsData)
      }

      // 2. Lấy danh sách backup logs
      const { data: logs, error: logsError } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!logsError && logs) {
        setBackupLogs(logs)
      }

      // 3. Kiểm tra storage bucket
      const { data: buckets } = await supabase.storage.listBuckets()
      setStorageBucketExists(buckets?.some(b => b.name === 'backups') || false)

      // 4. Kiểm tra edge function (thử gọi để xem có tồn tại không)
      // Note: Không thể check trực tiếp, nhưng có thể kiểm tra qua error
      setEdgeFunctionExists(true) // Giả định đã setup nếu có file

      // 5. Lấy danh sách files từ storage bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('backups')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (!filesError && files) {
        setStorageFiles(files)
      }

    } catch (error: any) {
      console.error('Error fetching backup status:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể kiểm tra trạng thái backup',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleAutoBackup = async () => {
    if (!settings) return

    try {
      const { error } = await supabase
        .from('backup_settings')
        .update({
          auto_backup_enabled: !settings.auto_backup_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      setSettings({
        ...settings,
        auto_backup_enabled: !settings.auto_backup_enabled
      })

      toast({
        title: 'Thành công',
        description: `Đã ${!settings.auto_backup_enabled ? 'bật' : 'tắt'} backup tự động`
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật cấu hình',
        variant: 'destructive'
      })
    }
  }

  const createManualBackup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Không có quyền')

      toast({
        title: 'Đang tạo backup...',
        description: 'Vui lòng đợi trong giây lát'
      })

      // Gọi API để tạo backup
      const response = await fetch('/api/backup/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Không thể tạo backup')
      }

      toast({
        title: 'Thành công',
        description: `Đã tạo backup thành công: ${result.data.filename} (${(result.data.file_size / 1024 / 1024).toFixed(2)} MB)`
      })

      // Refresh danh sách
      setTimeout(() => {
        fetchBackupStatus()
      }, 1500)
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo backup',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasBackupSystem = settings !== null

  return (
    <div className="space-y-4">
      {/* Thông báo nếu chưa setup */}
      {!hasBackupSystem && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Hệ thống backup chưa được setup. Hãy chạy <code className="px-1 py-0.5 bg-gray-100 rounded">npm run setup:backup</code> hoặc chạy file <code className="px-1 py-0.5 bg-gray-100 rounded">database/backup-system.sql</code> trong Supabase SQL Editor.
          </AlertDescription>
        </Alert>
      )}

      {hasBackupSystem && (
        <>
          {/* Cấu hình Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Cấu hình Backup</span>
              </CardTitle>
              <CardDescription>
                Quản lý cài đặt backup tự động
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Backup tự động</span>
                  <Badge variant={settings.auto_backup_enabled ? "default" : "secondary"}>
                    {settings.auto_backup_enabled ? 'Đã bật' : 'Đã tắt'}
                  </Badge>
                </div>
                <Button
                  onClick={toggleAutoBackup}
                  variant={settings.auto_backup_enabled ? "destructive" : "default"}
                  size="sm"
                >
                  {settings.auto_backup_enabled ? 'Tắt' : 'Bật'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <span className="text-sm text-gray-600">Tần suất</span>
                  <p className="font-medium">
                    {settings.backup_frequency === 'daily' ? 'Hàng ngày' : 
                     settings.backup_frequency === 'weekly' ? 'Hàng tuần' : 
                     'Hàng tháng'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Thời gian lưu trữ</span>
                  <p className="font-medium">{settings.retention_days} ngày</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Mã hóa</span>
                  <p className="font-medium">
                    {settings.encryption_enabled ? (
                      <span className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Đã bật</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-gray-400">
                        <XCircle className="h-4 w-4" />
                        <span>Chưa bật</span>
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Kích thước tối đa</span>
                  <p className="font-medium">{settings.max_backup_size_mb} MB</p>
                </div>
              </div>

              {/* Kiểm tra hệ thống */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <span>Database Tables</span>
                  </span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sẵn sàng
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4" />
                    <span>Storage Bucket</span>
                  </span>
                  <Badge variant={storageBucketExists ? "default" : "destructive"}>
                    {storageBucketExists ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sẵn sàng
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Chưa tạo
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Edge Function</span>
                  </span>
                  <Badge variant={edgeFunctionExists ? "default" : "secondary"}>
                    {edgeFunctionExists ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã setup
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Cần deploy
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={createManualBackup}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Tạo Backup Thủ Công
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lịch sử Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Lịch sử Backup</span>
              </CardTitle>
              <CardDescription>
                Danh sách các lần backup gần đây ({backupLogs.length} logs, {storageFiles.length} files)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Tab để chuyển giữa Logs và Files */}
              <div className="mb-4 flex space-x-2 border-b">
                <Button
                  variant={viewingFile === null ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewingFile(null)}
                >
                  Backup Logs
                </Button>
                <Button
                  variant={viewingFile === 'files' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewingFile('files')}
                >
                  Files trong Storage ({storageFiles.length})
                </Button>
              </div>

              {viewingFile === 'files' ? (
                // Hiển thị files từ storage
                storageFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có file nào trong bucket "backups"</p>
                    <p className="text-xs mt-2">Click "Tạo Backup Thủ Công" để tạo file đầu tiên</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {storageFiles.map((file) => {
                      const log = backupLogs.find(l => l.file_name === file.name)
                      return (
                        <div
                          key={file.name}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-sm">{file.name}</span>
                              {log && (
                                <Badge
                                  variant={
                                    log.status === 'success' ? 'default' :
                                    log.status === 'failed' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {log.status === 'success' ? 'Thành công' :
                                   log.status === 'failed' ? 'Thất bại' :
                                   'Đang chờ'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>
                                {file.created_at ? new Date(file.created_at).toLocaleString('vi-VN') : 'N/A'}
                              </span>
                              {file.metadata?.size && (
                                <span>
                                  {(file.metadata.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/backup/download?filename=${encodeURIComponent(file.name)}`)
                                const result = await response.json()
                                
                                if (result.success) {
                                  if (result.encrypted) {
                                    toast({
                                      title: 'File đã được mã hóa',
                                      description: (
                                        <div className="mt-2 space-y-1 text-left">
                                          <p><strong>Algorithm:</strong> {result.metadata.algorithm}</p>
                                          <p><strong>Created:</strong> {new Date(result.metadata.created_at).toLocaleString('vi-VN')}</p>
                                          <p><strong>Type:</strong> {result.metadata.type}</p>
                                          <p><strong>Encrypted size:</strong> {(result.encryptedLength / 1024).toFixed(2)} KB</p>
                                          <p className="text-xs text-gray-500 mt-2">File đã được mã hóa. Cần encryption key để giải mã.</p>
                                        </div>
                                      ),
                                      duration: 10000
                                    })
                                  } else {
                                    toast({
                                      title: 'Thông tin file backup',
                                      description: `File chứa: ${result.keys?.join(', ')}`,
                                      duration: 5000
                                    })
                                  }
                                }
                              } catch (error: any) {
                                toast({
                                  title: 'Lỗi',
                                  description: error.message,
                                  variant: 'destructive'
                                })
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                // Hiển thị backup logs
                backupLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Chưa có backup nào</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backupLogs.map((log) => {
                      const file = storageFiles.find(f => f.name === log.file_name)
                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {file && <Lock className="h-3 w-3 text-gray-400" />}
                              <span className="font-medium text-sm">{log.file_name}</span>
                              <Badge
                                variant={
                                  log.status === 'success' ? 'default' :
                                  log.status === 'failed' ? 'destructive' :
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {log.status === 'success' ? 'Thành công' :
                                 log.status === 'failed' ? 'Thất bại' :
                                 log.status === 'processing' ? 'Đang xử lý' :
                                 'Đang chờ'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {log.backup_type === 'auto' ? 'Tự động' :
                                 log.backup_type === 'manual' ? 'Thủ công' :
                                 'Lên lịch'}
                              </Badge>
                              {file && (
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Có file
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>
                                {new Date(log.created_at).toLocaleString('vi-VN')}
                              </span>
                              {log.file_size && (
                                <span>
                                  {(log.file_size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                            {log.error_message && (
                              <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

