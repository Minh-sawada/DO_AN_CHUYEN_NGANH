'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { ChatInterfaceWithTabs } from '@/components/chat/ChatInterfaceWithTabs'
import { Header } from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

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

  // Luôn hiển thị chat interface, không cần đăng nhập
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