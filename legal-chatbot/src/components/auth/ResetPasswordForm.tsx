'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    // Xử lý cả hash fragment (#access_token) và query params (?code)
    const processAuthTokens = async () => {
      setInitializing(true)
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Kiểm tra error parameters trước (từ Supabase redirect với lỗi)
        const urlParams = new URLSearchParams(window.location.search)
        const error = urlParams.get('error')
        const errorCode = urlParams.get('error_code')
        const errorDescription = urlParams.get('error_description')
        
        // Xử lý error trong query params
        if (error || errorCode || errorDescription) {
          console.log('Error detected in reset password form:', { error, errorCode, errorDescription })
          
          let errorMessage = 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
          
          if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            errorMessage = 'Link đặt lại mật khẩu đã hết hạn. Link chỉ có hiệu lực trong 1 giờ. Vui lòng yêu cầu email mới.'
          } else if (errorCode === 'access_denied' || errorDescription?.includes('invalid')) {
            errorMessage = 'Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu email mới.'
          } else if (errorDescription) {
            errorMessage = `Lỗi: ${decodeURIComponent(errorDescription)}`
          }
          
          setError(errorMessage)
          setInitializing(false)
          
          // Xóa error parameters khỏi URL
          window.history.replaceState(null, '', window.location.pathname)
          
          // Hiển thị toast
          toast({
            title: 'Lỗi',
            description: errorMessage,
            variant: 'destructive',
            duration: 10000,
          })
          
          return
        }
        
        // Kiểm tra query params (code từ Supabase redirect)
        const code = urlParams.get('code')
        const tokenHash = urlParams.get('token_hash')
        let typeFromQuery = urlParams.get('type')
        
        // Nếu không có type nhưng có password_reset_initiated trong sessionStorage, coi như recovery
        if (!typeFromQuery && typeof window !== 'undefined') {
          const passwordResetInitiated = sessionStorage.getItem('password_reset_initiated')
          if (passwordResetInitiated === 'true') {
            typeFromQuery = 'recovery'
            sessionStorage.removeItem('password_reset_initiated')
          }
        }
        
        // Kiểm tra hash fragment (cho cả error và access_token)
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        
        // Kiểm tra error trong hash fragment
        const hashError = hashParams.get('error')
        const hashErrorCode = hashParams.get('error_code')
        const hashErrorDescription = hashParams.get('error_description')
        
        if (hashError || hashErrorCode || hashErrorDescription) {
          console.log('Error detected in hash fragment:', { hashError, hashErrorCode, hashErrorDescription })
          
          let errorMessage = 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
          
          if (hashErrorCode === 'otp_expired' || hashErrorDescription?.includes('expired')) {
            errorMessage = 'Link đặt lại mật khẩu đã hết hạn. Link chỉ có hiệu lực trong 1 giờ. Vui lòng yêu cầu email mới.'
          } else if (hashErrorCode === 'access_denied' || hashErrorDescription?.includes('invalid')) {
            errorMessage = 'Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu email mới.'
          } else if (hashErrorDescription) {
            errorMessage = `Lỗi: ${decodeURIComponent(hashErrorDescription)}`
          }
          
          setError(errorMessage)
          setInitializing(false)
          
          // Xóa hash fragment
          window.history.replaceState(null, '', window.location.pathname)
          
          // Hiển thị toast
          toast({
            title: 'Lỗi',
            description: errorMessage,
            variant: 'destructive',
            duration: 10000,
          })
          
          return
        }
        
        // Kiểm tra access_token trong hash fragment (nếu không có error)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const typeFromHash = hashParams.get('type')

        console.log('Reset password - URL:', window.location.href.substring(0, 100) + '...')
        console.log('Reset password - Has code:', !!code)
        console.log('Reset password - Has token_hash:', !!tokenHash)
        console.log('Reset password - Has hash token:', !!accessToken)

        // Ưu tiên 1: Nếu có token_hash (recovery token từ email)
        if (tokenHash && (typeFromQuery === 'recovery' || typeFromQuery === 'reset')) {
          console.log('Processing token_hash from query params...')
          
          // Thử verify OTP với token_hash
          try {
            // Lấy email từ URL hoặc từ user (nếu đã đăng nhập)
            // Với recovery, ta cần email để verify
            // Nhưng thực ra với token_hash, ta không cần email
            // Supabase sẽ tự động xác thực từ token_hash
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery'
            })
            
            if (verifyError) {
              console.error('Verify OTP error:', verifyError)
              setError(`Không thể xác thực link: ${verifyError.message}. Vui lòng yêu cầu lại email.`)
              setInitializing(false)
              return
            }
            
            if (verifyData?.session) {
              console.log('Session created from token_hash')
              window.history.replaceState(null, '', window.location.pathname)
              setInitializing(false)
              return
            } else {
              setError('Không thể tạo phiên đăng nhập. Vui lòng yêu cầu lại email.')
              setInitializing(false)
              return
            }
          } catch (err: any) {
            console.error('Error in token_hash verification:', err)
            setError('Có lỗi xảy ra khi xử lý link đặt lại mật khẩu. Vui lòng yêu cầu lại email.')
            setInitializing(false)
            return
          }
        }
        
        // Ưu tiên 1.5: Nếu có code trong query params (từ Supabase redirect)
        if (code && (typeFromQuery === 'recovery' || typeFromQuery === 'reset')) {
          console.log('Processing code from query params...')
          
          // Thử exchange code trực tiếp
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            
            if (exchangeError) {
              console.error('Exchange code error:', exchangeError)
              // Nếu lỗi về code_verifier, thử đợi Supabase tự xử lý
              if (exchangeError.message.includes('code verifier') || exchangeError.message.includes('code_verifier')) {
                console.log('Code verifier missing, waiting for Supabase auto-handle...')
                // Đợi Supabase tự xử lý qua onAuthStateChange
                let attempts = 0
                const checkSession = setInterval(async () => {
                  attempts++
                  const { data: { session }, error } = await supabase.auth.getSession()
                  
                  if (session && session.access_token) {
                    console.log('Session created from code (auto-handled)')
                    clearInterval(checkSession)
                    window.history.replaceState(null, '', window.location.pathname)
                    setInitializing(false)
                  } else if (error || attempts > 30) {
                    console.error('Failed to get session from code:', error)
                    clearInterval(checkSession)
                    setError('Không thể xác thực link đặt lại mật khẩu. Link có thể đã hết hạn. Vui lòng yêu cầu lại email.')
                    setInitializing(false)
                  }
                }, 200)
                
                // Cleanup sau 10 giây
                setTimeout(() => clearInterval(checkSession), 10000)
                return
              } else {
                setError(`Không thể xác thực link: ${exchangeError.message}. Vui lòng yêu cầu lại email.`)
                setInitializing(false)
                return
              }
            }
            
            if (exchangeData?.session) {
              console.log('Session created from code exchange')
              window.history.replaceState(null, '', window.location.pathname)
              setInitializing(false)
              return
            } else {
              setError('Không thể tạo phiên đăng nhập. Vui lòng yêu cầu lại email.')
              setInitializing(false)
              return
            }
          } catch (err: any) {
            console.error('Error in code exchange:', err)
            setError('Có lỗi xảy ra khi xử lý link đặt lại mật khẩu. Vui lòng yêu cầu lại email.')
            setInitializing(false)
            return
          }
        }

        // Ưu tiên 2: Nếu có token trong hash fragment
        if (typeFromHash === 'recovery' && accessToken) {
          console.log('Processing recovery token from hash...')
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('Session error:', error)
            setError(`Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn: ${error.message}`)
            setInitializing(false)
          } else if (data?.session) {
            console.log('Session set successfully from hash')
            window.history.replaceState(null, '', window.location.pathname)
            setInitializing(false)
          } else {
            console.error('No session returned from hash')
            setError('Không thể xác thực phiên đăng nhập. Vui lòng yêu cầu lại email.')
            setInitializing(false)
          }
          return
        }

        // Ưu tiên 3: Kiểm tra session hiện tại (có thể đã được set từ trước)
        console.log('Checking existing session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Get session error:', error)
          setError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email.')
          setInitializing(false)
        } else if (session) {
          console.log('Existing session found')
          setInitializing(false)
        } else {
          console.log('No session, code, or hash found')
          setError('Bạn cần truy cập qua link trong email để đặt lại mật khẩu.')
          setInitializing(false)
        }
      } catch (err: any) {
        console.error('Error processing auth tokens:', err)
        setError('Có lỗi xảy ra: ' + (err.message || 'Unknown error'))
        setInitializing(false)
      }
    }

    processAuthTokens()
    
    // Lắng nghe hashchange
    const handleHashChange = () => {
      if (window.location.hash.includes('access_token')) {
        processAuthTokens()
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Lỗi',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setSuccess(true)
        toast({
          title: 'Thành công',
          description: 'Mật khẩu đã được đặt lại thành công!',
        })
        
        // Redirect về trang chủ sau 2 giây
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error: any) {
      setError('Có lỗi xảy ra, vui lòng thử lại.')
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra, vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Đặt lại mật khẩu thành công!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Mật khẩu của bạn đã được cập nhật. Đang chuyển đến trang chủ...
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <Button
            onClick={() => router.push('/')}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl"
          >
            Đi đến trang chủ
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Loading state khi đang khởi tạo
  if (initializing) {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Đang xử lý...
          </CardTitle>
          <CardDescription className="text-gray-600">
            Đang xác thực link đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Error state khi không có token hoặc session
  if (error && !password && !confirmPassword) {
    const isExpiredError = error.includes('hết hạn') || error.includes('expired')
    
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isExpiredError ? 'Link đã hết hạn' : 'Link không hợp lệ'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {error}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Link đặt lại mật khẩu chỉ có hiệu lực trong 1 giờ. Nếu link đã hết hạn hoặc không hợp lệ, vui lòng yêu cầu email mới.
            </p>
          </div>
          
          <Button
            onClick={() => router.push('/')}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl"
          >
            Về trang chủ
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // Redirect đến trang chủ với query param để mở forgot password form
              router.push('/?action=forgot-password')
            }}
            className="w-full h-12"
          >
            Yêu cầu email đặt lại mật khẩu mới
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Đặt lại mật khẩu
        </CardTitle>
        <CardDescription className="text-gray-600">
          Nhập mật khẩu mới của bạn
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Mật khẩu mới
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              minLength={6}
              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Xác nhận mật khẩu
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Nhập lại mật khẩu mới"
              minLength={6}
              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl shadow-lg disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-5 w-5" />
                Đặt lại mật khẩu
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

