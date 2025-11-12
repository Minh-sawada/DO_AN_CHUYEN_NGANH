'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

interface ForgotPasswordFormProps {
  onBack?: () => void
  onSuccess?: () => void
}

export function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Gửi email reset password
      // Sử dụng API route để xử lý code exchange (tránh lỗi code_verifier)
      // Hoặc redirect trực tiếp đến reset-password page
      const redirectUrl = `${window.location.origin}/reset-password`
      
      // Lưu vào sessionStorage để có thể kiểm tra trong callback
      sessionStorage.setItem('supabase.auth.redirect_url', redirectUrl)
      sessionStorage.setItem('password_reset_initiated', 'true')
      
      console.log('Sending reset password email to:', email)
      console.log('Redirect URL:', redirectUrl)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        toast({
          title: 'Lỗi',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setSent(true)
        toast({
          title: 'Email đã được gửi',
          description: 'Vui lòng kiểm tra hộp thư email của bạn để đặt lại mật khẩu.',
        })
        onSuccess?.()
      }
    } catch (error: any) {
      console.error('Forgot password error:', error)
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra, vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Email đã được gửi!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Vui lòng kiểm tra hộp thư email của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Email có thể nằm trong thư mục spam. Link đặt lại mật khẩu sẽ hết hạn sau 1 giờ.
            </p>
          </div>
          
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full h-12"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Quay lại đăng nhập
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Quên mật khẩu?
        </CardTitle>
        <CardDescription className="text-gray-600">
          Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-5">
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
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-xl shadow-lg disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Gửi link đặt lại mật khẩu
              </>
            )}
          </Button>
        </form>

        {onBack && (
          <Button
            variant="link"
            onClick={onBack}
            className="w-full text-sm text-gray-600 hover:text-blue-600 p-0 h-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại đăng nhập
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

