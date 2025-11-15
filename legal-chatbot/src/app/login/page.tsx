'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Scale } from 'lucide-react'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Nếu đã đăng nhập, redirect về trang chủ hoặc URL đã lưu
  useEffect(() => {
    if (!loading && user) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/'
      sessionStorage.removeItem('redirectAfterLogin')
      router.push(redirectPath)
    }
  }, [user, loading, router])

  if (loading) {
    return <LoadingSpinner />
  }

  // Nếu đã đăng nhập, không hiển thị gì (sẽ redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Scale className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Đăng nhập
              </CardTitle>
              <CardDescription className="text-base">
                Đăng nhập để sử dụng Legal Chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm 
                onSuccess={() => {
                  // Redirect về trang chủ hoặc URL đã lưu sau khi đăng nhập thành công
                  const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/'
                  sessionStorage.removeItem('redirectAfterLogin')
                  router.push(redirectPath)
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

