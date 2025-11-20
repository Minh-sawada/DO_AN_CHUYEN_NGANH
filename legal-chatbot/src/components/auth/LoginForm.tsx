'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Scale, LogIn, UserPlus, Shield, Zap } from 'lucide-react'
import { ForgotPasswordForm } from './ForgotPasswordForm'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const friendlyAuthError = (msg?: string) => {
    const m = (msg || '').toLowerCase()
    if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng'
    if (m.includes('email not confirmed')) return 'Email của bạn chưa được xác thực'
    if (m.includes('user already registered')) return 'Email này đã được đăng ký'
    if (m.includes('password should be at least')) return 'Mật khẩu chưa đủ độ dài tối thiểu'
    if (m.includes('rate limit')) return 'Bạn thao tác quá nhanh, vui lòng thử lại sau'
    return msg || 'Có lỗi xảy ra, vui lòng thử lại.'
  }

  // Hiển thị form quên mật khẩu
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBack={() => setShowForgotPassword(false)}
        onSuccess={() => {
          // Có thể giữ form hoặc quay lại login
        }}
      />
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // 1. Check ban status trước khi đăng nhập
      let banData: any = null
      try {
        const banResponse = await fetch('/api/auth/check-ban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })

        banData = await banResponse.json()

        if (!banResponse.ok) {
          console.warn('Skip ban check due to error:', banData.error)
          banData = null
        }
      } catch (error) {
        console.error('Ban check failed, continue login:', error)
        banData = null
      }

      if (banData?.isBanned && banData?.role !== 'admin') {
        const bannedUntil = banData.banInfo?.bannedUntil
          ? new Date(banData.banInfo.bannedUntil).toLocaleString('vi-VN')
          : null

        toast({
          title: 'Tài khoản đang bị khóa',
          description: banData.banInfo?.reason
            ? `${banData.banInfo.reason}${bannedUntil ? ` (mở khóa sau: ${bannedUntil})` : ''}`
            : 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          try {
            const logResponse = await fetch('/api/auth/log-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                success: false,
                errorMessage: error.message
              })
            })

            const logData = await logResponse.json()

            if (logResponse.ok) {
              const banStatus = logData.result?.ban_status
              if (banStatus?.is_banned) {
                const bannedUntil = banStatus?.banned_until
                  ? new Date(banStatus.banned_until).toLocaleString('vi-VN')
                  : null

                toast({
                  title: 'Tài khoản bị khóa tạm thời',
                  description: banStatus?.reason
                    ? `${banStatus.reason}${bannedUntil ? ` (mở khóa sau: ${bannedUntil})` : ''}`
                    : 'Bạn đã bị khóa tạm thời do đăng nhập sai quá nhiều lần.',
                  variant: 'destructive'
                })
                setLoading(false)
                return
              }
            } else {
              console.error('Failed to log login attempt:', logData.error)
            }
          } catch (logError) {
            console.error('Log login attempt error:', logError)
          }

          const friendly = friendlyAuthError(error.message)
          setMessage({ type: 'error', text: friendly })
          toast({
            title: 'Lỗi đăng nhập',
            description: friendly,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Đăng nhập thành công',
            description: 'Chào mừng bạn quay trở lại!',
          })
          onSuccess?.()
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) {
          const friendly = friendlyAuthError(error.message)
          setMessage({ type: 'error', text: friendly })
          toast({
            title: 'Lỗi đăng ký',
            description: friendly,
            variant: 'destructive',
          })
        } else {
          setMessage({ type: 'success', text: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.' })
          toast({
            title: 'Đăng ký thành công',
            description: 'Vui lòng kiểm tra email để xác thực tài khoản.',
          })
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại.' })
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra, vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
          <Scale className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {isLogin 
            ? 'Đăng nhập để tiếp tục sử dụng dịch vụ' 
            : 'Đăng ký để sử dụng Legal Chatbot miễn phí'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        {message && (
          <div
            role="alert"
            className={
              message.type === 'error'
                ? 'rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3'
                : 'rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3'
            }
          >
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Họ và tên
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                placeholder="Nhập họ và tên"
                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Nhập email của bạn"
              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mật khẩu
              </Label>
              {isLogin && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
                >
                  Quên mật khẩu?
                </Button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Nhập mật khẩu"
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
            ) : isLogin ? (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Đăng nhập
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Tạo tài khoản
              </>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Hoặc</span>
          </div>
        </div>
        
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-600 hover:text-blue-600 p-0 h-auto"
          >
            {isLogin 
              ? 'Chưa có tài khoản? Đăng ký miễn phí' 
              : 'Đã có tài khoản? Đăng nhập ngay'
            }
          </Button>
        </div>

        {/* Features */}
        <div className="pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="flex flex-col items-center space-y-1">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs text-gray-600">Bảo mật</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs text-gray-600">Nhanh chóng</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
