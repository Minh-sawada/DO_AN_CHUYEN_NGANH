import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      success,
      errorMessage
    }: {
      email?: string
      success?: boolean
      errorMessage?: string | null
    } = body

    if (!email || typeof success === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, success' },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      null

    const userAgent = request.headers.get('user-agent') || null

    const { data, error } = await (supabaseAdmin as any).rpc('log_login_attempt', {
      p_email: email,
      p_success: success,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_error_message: errorMessage || null
    })

    if (error) {
      console.error('log-login RPC error:', error)
      // Log chi tiết lỗi để debug
      console.error('RPC error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Không ghi log được lần đăng nhập',
          errorDetails: error.message || 'Unknown error',
          errorCode: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      result: data
    })
  } catch (error) {
    console.error('log-login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


