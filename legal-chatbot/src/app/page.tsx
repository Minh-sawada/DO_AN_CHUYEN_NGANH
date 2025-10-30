'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { ChatInterfaceWithTabs } from '@/components/chat/ChatInterfaceWithTabs'
import { Header } from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span>Chào mừng trở lại!</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Hỏi đáp
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Pháp luật</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-6">
              Đặt câu hỏi về pháp luật và nhận câu trả lời chính xác từ AI
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Badge variant="secondary" className="px-4 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer">
                <MessageSquare className="h-4 w-4 mr-2" />
                Luật dân sự
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Luật hình sự
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer">
                <Scale className="h-4 w-4 mr-2" />
                Luật lao động
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer">
                <Shield className="h-4 w-4 mr-2" />
                Luật doanh nghiệp
              </Badge>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">AI Legal Assistant</h3>
                  <p className="text-blue-100 text-sm">Sẵn sàng hỗ trợ bạn</p>
                </div>
                <div className="ml-auto flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm">Online</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <ChatInterfaceWithTabs />
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2">Phản hồi nhanh</h4>
                <p className="text-sm text-gray-600">Nhận câu trả lời trong vài giây</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold mb-2">Độ chính xác cao</h4>
                <p className="text-sm text-gray-600">Dựa trên văn bản pháp luật chính thức</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2">Miễn phí</h4>
                <p className="text-sm text-gray-600">Sử dụng không giới hạn</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="h-6 w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold mb-2">Dễ sử dụng</h4>
                <p className="text-sm text-gray-600">Giao diện thân thiện, trực quan</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}