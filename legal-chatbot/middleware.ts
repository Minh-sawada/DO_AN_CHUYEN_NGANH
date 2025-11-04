import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protect upload API routes
  if (req.nextUrl.pathname.startsWith('/api/upload')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 })
    }
    
    // Check if user is admin or editor for upload operations
    if (req.nextUrl.pathname.includes('upload-direct') || req.nextUrl.pathname.includes('upload-simple')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
        return NextResponse.json({ error: 'Forbidden - Admin or Editor access required' }, { status: 403 })
      }
    }
  }
  
  // Protect laws upload/update routes (allow admin and editor)
  if (req.nextUrl.pathname.startsWith('/api/laws/upload')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden - Admin or Editor access required' }, { status: 403 })
    }
  }
  
  // Protect admin API routes
  // Để API route tự xử lý authentication (API route có check đầy đủ hơn)
  // Bỏ middleware check để tránh conflict với cookies
  // if (req.nextUrl.pathname.startsWith('/api/admin')) {
  //   // API route sẽ tự check authentication và role
  // }
  
  return response
}

export const config = {
  matcher: [
    '/api/upload/:path*',
    // '/api/admin/:path*', // Bỏ middleware check, để API route tự xử lý
    '/api/laws/upload/:path*'
  ]
}
