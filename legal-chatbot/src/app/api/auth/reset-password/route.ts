import { NextRequest, NextResponse } from 'next/server'

// API route này chỉ redirect đến reset-password page với code
// ResetPasswordForm sẽ xử lý code exchange
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }

  // Redirect đến reset-password với code
  // ResetPasswordForm sẽ exchange code thành session
  const redirectUrl = new URL('/reset-password', req.url)
  redirectUrl.searchParams.set('code', code)
  if (type) {
    redirectUrl.searchParams.set('type', type)
  }
  
  return NextResponse.redirect(redirectUrl.toString())
}
