import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Route này xử lý OAuth callback từ Supabase
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }

  // Nếu là recovery flow, redirect đến reset-password
  if (type === 'recovery' || type === 'reset') {
    // Redirect đến reset-password với code trong query
    return NextResponse.redirect(new URL(`/reset-password?code=${code}&type=recovery`, req.url))
  }

  // Normal OAuth, redirect về homepage
  return NextResponse.redirect(new URL('/', req.url))
}

