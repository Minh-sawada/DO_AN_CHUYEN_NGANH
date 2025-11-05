'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { ChatInterfaceWithTabs } from '@/components/chat/ChatInterfaceWithTabs'
import { Header } from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { 
  Scale, 
  Brain, 
  MessageSquare, 
  FileText, 
  Shield, 
  Sparkles,
  ArrowRight,
  Star,
  Users,
  Clock
} from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Xử lý code từ Supabase callback
  // Nếu có code và là recovery flow, redirect đến API route để xử lý
  useEffect(() => {
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    
    if (code) {
      console.log('Code detected in homepage URL')
      console.log('Type:', type)
      
      // Kiểm tra recovery flow
      const savedRedirectUrl = sessionStorage.getItem('supabase.auth.redirect_url') || ''
      const isRecovery = type === 'recovery' || 
                        type === 'reset' ||
                        savedRedirectUrl.includes('reset-password') ||
                        savedRedirectUrl.includes('api/auth/reset-password')
      
      if (isRecovery) {
        console.log('Password recovery detected, redirecting to API route...')
        sessionStorage.removeItem('supabase.auth.redirect_url')
        
        // Redirect đến API route để exchange code và redirect đến reset-password
        window.location.href = `/api/auth/reset-password?code=${code}&type=recovery`
      } else {
        // Normal flow, chỉ cần xóa code
        console.log('Normal flow, removing code from URL')
        router.replace('/')
      }
    }
  }, [searchParams, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Legal Assistant</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Chatbot
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Pháp luật</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Hỏi đáp về các vấn đề pháp luật Việt Nam với AI thông minh. 
                Nhận câu trả lời chính xác và nhanh chóng từ cơ sở dữ liệu pháp luật đầy đủ.
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Brain className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI Thông minh</h3>
                    <p className="text-gray-600 text-sm">Sử dụng công nghệ AI tiên tiến để hiểu và trả lời câu hỏi pháp luật</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Cơ sở dữ liệu đầy đủ</h3>
                    <p className="text-gray-600 text-sm">Truy cập vào hàng nghìn văn bản pháp luật Việt Nam</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Bảo mật & Tin cậy</h3>
                    <p className="text-gray-600 text-sm">Thông tin được bảo mật và trích dẫn nguồn chính xác</p>
                  </CardContent>
                </Card>
              </div>

              {/* Stats */}
              <div className="flex justify-center space-x-8 mb-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">1000+</div>
                  <div className="text-sm text-gray-600">Văn bản pháp luật</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">24/7</div>
                  <div className="text-sm text-gray-600">Hỗ trợ liên tục</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">95%</div>
                  <div className="text-sm text-gray-600">Độ chính xác</div>
                </div>
              </div>
            </div>

            {/* Login Form */}
            <div className="max-w-md mx-auto">
              <LoginForm />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/50 backdrop-blur-sm border-t">
          <div className="container mx-auto px-4 py-8 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Scale className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold">Legal Chatbot</span>
            </div>
            <p className="text-gray-600 text-sm">
              © 2024 Legal Chatbot. Được phát triển với ❤️ để hỗ trợ cộng đồng.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        {/* Chat Interface - Full Screen Claude Style */}
        <div className="h-full flex">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
              <ChatInterfaceWithTabs />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}