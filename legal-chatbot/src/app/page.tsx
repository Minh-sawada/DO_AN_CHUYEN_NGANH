'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { Header } from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect đến trang login nếu chưa đăng nhập
  useEffect(() => {
    if (!user && !loading) {
      // Lưu URL hiện tại để redirect lại sau khi đăng nhập (nếu cần)
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath)
      }
      router.push('/login')
    }
  }, [user, loading, router])

  // Xử lý code và error từ Supabase callback
  useEffect(() => {
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')
    
    // Xử lý error parameters từ query params
    if (error || errorCode || errorDescription) {
      console.log('Error detected in URL:', { error, errorCode, errorDescription })
      
      // Kiểm tra xem có phải recovery flow không
      const savedRedirectUrl = sessionStorage.getItem('supabase.auth.redirect_url') || ''
      const isRecovery = savedRedirectUrl.includes('reset-password') || 
                        savedRedirectUrl.includes('api/auth/reset-password') ||
                        errorCode === 'otp_expired' ||
                        errorDescription?.includes('expired') ||
                        errorDescription?.includes('invalid')
      
      if (isRecovery) {
        console.log('Password recovery error detected, redirecting to reset-password page...')
        sessionStorage.removeItem('supabase.auth.redirect_url')
        
        // Redirect đến reset-password page với error parameters
        const resetPasswordUrl = new URL('/reset-password', window.location.origin)
        if (error) resetPasswordUrl.searchParams.set('error', error)
        if (errorCode) resetPasswordUrl.searchParams.set('error_code', errorCode)
        if (errorDescription) resetPasswordUrl.searchParams.set('error_description', errorDescription)
        
        console.log('Redirecting to:', resetPasswordUrl.toString())
        window.location.href = resetPasswordUrl.toString()
        return
      }
      
      // Nếu không phải recovery flow, chỉ xóa error params và tiếp tục
      console.log('Error in non-recovery flow, cleaning URL...')
      router.replace('/')
      return
    }
    
    // Xử lý hash fragment errors (#error=...)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1)
      if (hash.includes('error=')) {
        const hashParams = new URLSearchParams(hash)
        const hashError = hashParams.get('error')
        const hashErrorCode = hashParams.get('error_code')
        const hashErrorDescription = hashParams.get('error_description')
        
        if (hashError || hashErrorCode || hashErrorDescription) {
          console.log('Error detected in hash fragment:', { hashError, hashErrorCode, hashErrorDescription })
          
          const savedRedirectUrl = sessionStorage.getItem('supabase.auth.redirect_url') || ''
          const isRecovery = savedRedirectUrl.includes('reset-password') || 
                            savedRedirectUrl.includes('api/auth/reset-password') ||
                            hashErrorCode === 'otp_expired' ||
                            hashErrorDescription?.includes('expired') ||
                            hashErrorDescription?.includes('invalid')
          
          if (isRecovery) {
            console.log('Password recovery error in hash, redirecting to reset-password page...')
            sessionStorage.removeItem('supabase.auth.redirect_url')
            
            // Redirect đến reset-password page với error parameters
            const resetPasswordUrl = new URL('/reset-password', window.location.origin)
            if (hashError) resetPasswordUrl.searchParams.set('error', hashError)
            if (hashErrorCode) resetPasswordUrl.searchParams.set('error_code', hashErrorCode)
            if (hashErrorDescription) resetPasswordUrl.searchParams.set('error_description', hashErrorDescription)
            
            // Xóa hash fragment
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
            
            console.log('Redirecting to:', resetPasswordUrl.toString())
            window.location.href = resetPasswordUrl.toString()
            return
          }
        }
      }
    }
    
    // Xử lý code parameter
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
        // Đảm bảo có type parameter
        const redirectUrl = `/api/auth/reset-password?code=${encodeURIComponent(code)}&type=recovery`
        console.log('Redirecting to:', redirectUrl)
        window.location.href = redirectUrl
        return
      }
      
      // Nếu có code nhưng không có type, có thể là recovery flow
      // Thử check xem có trong sessionStorage không
      if (!type && savedRedirectUrl) {
        console.log('Code without type but has saved redirect URL, assuming recovery flow')
        sessionStorage.removeItem('supabase.auth.redirect_url')
        const redirectUrl = `/api/auth/reset-password?code=${encodeURIComponent(code)}&type=recovery`
        console.log('Redirecting to:', redirectUrl)
        window.location.href = redirectUrl
        return
      }
      
        // Normal flow, chỉ cần xóa code
        console.log('Normal flow, removing code from URL')
        router.replace('/')
    }
  }, [searchParams, router])

  if (loading) {
    return <LoadingSpinner />
  }

  // Nếu chưa đăng nhập, không hiển thị gì (sẽ redirect)
  if (!user) {
    return <LoadingSpinner />
  }

  // Chỉ hiển thị chat interface khi đã đăng nhập
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        {/* Chat Layout với Sidebar - ChatGPT Style */}
        <ChatLayout />
      </main>
    </div>
  )
}