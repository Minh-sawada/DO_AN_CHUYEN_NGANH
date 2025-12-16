import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

function signSupabaseJwt(userId: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET

  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not set in environment variables')
  }

  const payload = {
    sub: userId,
    role: 'authenticated',
  }

  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  })

  return token
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body.userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu hoặc sai userId.' },
        { status: 400 },
      )
    }

    const userId = body.userId

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy người dùng.' },
        { status: 404 },
      )
    }

    const accessToken = signSupabaseJwt(userId)

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      token_type: 'bearer',
      user_id: userId,
    })
  } catch (error) {
    console.error('Face login-user API error:', error)
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi tạo phiên đăng nhập.' },
      { status: 500 },
    )
  }
}
