'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { Header } from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'

export default function AdminPage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-red-500" />
              <span>Yêu cầu đăng nhập</span>
            </CardTitle>
            <CardDescription>
              Vui lòng đăng nhập để truy cập trang quản trị
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Trang này chỉ dành cho quản trị viên.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Bạn không có quyền truy cập trang quản trị. Chỉ có quản trị viên mới có thể truy cập.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Trang Quản Trị
            </h1>
            <p className="text-gray-600">
              Quản lý văn bản pháp luật và theo dõi hệ thống
            </p>
          </div>
          <AdminPanel />
        </div>
      </main>
    </div>
  )
}
