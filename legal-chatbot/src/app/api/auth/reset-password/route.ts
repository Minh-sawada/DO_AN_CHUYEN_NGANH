import { NextRequest, NextResponse } from 'next/server'

// API route này chỉ redirect đến reset-password page với code
// ResetPasswordForm sẽ xử lý code exchange
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    
    console.log('Reset password API route called')
    console.log('Code:', code ? 'present' : 'missing')
    console.log('Type:', type || 'not specified')
    
    if (!code) {
      console.error('No code parameter found')
      return NextResponse.redirect(new URL('/?error=no_code', req.url))
    }

    // Redirect đến reset-password với code
    // ResetPasswordForm sẽ exchange code thành session
    const baseUrl = new URL(req.url)
    const redirectUrl = new URL('/reset-password', baseUrl.origin)
    redirectUrl.searchParams.set('code', code)
    
    // Đảm bảo có type parameter (mặc định là recovery nếu không có)
    redirectUrl.searchParams.set('type', type || 'recovery')
    
    console.log('Redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error: any) {
    console.error('Error in reset-password route:', error)
    return NextResponse.redirect(new URL('/?error=reset_password_error', req.url))
  }
}
