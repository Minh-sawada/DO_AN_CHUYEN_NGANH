'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

function ResetPasswordPageContent() {
  const router = useRouter()

  useEffect(() => {
    // Đảm bảo hash fragment được giữ lại sau khi route load
    // Đặc biệt quan trọng khi redirect từ email
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      
      // Nếu có hash fragment, đảm bảo nó không bị mất
      if (hash && hash.includes('access_token')) {
        // Hash đã có sẵn, không cần làm gì
        console.log('Reset password page loaded with hash fragment')
      } else {
        // Không có hash, có thể đã bị mất trong quá trình routing
        // Kiểm tra xem có trong sessionStorage không (backup)
        const storedHash = sessionStorage.getItem('reset_password_hash')
        if (storedHash && !hash) {
          // Khôi phục hash từ sessionStorage
          window.location.hash = storedHash
          sessionStorage.removeItem('reset_password_hash')
        }
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <ResetPasswordForm />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}

