import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

export async function POST(req: NextRequest) {
  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    })

    const { data: { user }, error: userError } = await authClient.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Bạn cần đăng nhập trước khi đăng ký khuôn mặt.' },
        { status: 401 },
      )
    }

    const body = await req.json().catch(() => null)

    if (!body || !Array.isArray(body.descriptor)) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu descriptor không hợp lệ.' },
        { status: 400 },
      )
    }

    const descriptor: number[] = body.descriptor

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ face_descriptor: descriptor })
      .eq('id', user.id)

    if (updateError) {
      console.error('Face enroll descriptor: failed to update profile', updateError)
      return NextResponse.json(
        { success: false, error: 'Lỗi lưu descriptor khuôn mặt vào hồ sơ người dùng.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Face enroll descriptor API error:', error)
    return NextResponse.json(
      { success: false, error: 'Lỗi server khi đăng ký descriptor khuôn mặt.' },
      { status: 500 },
    )
  }
}
