import { createClient } from '@supabase/supabase-js'


// Lấy từ .env.local - KHÔNG hardcode keys trong code!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local file.')
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
    // Suppress refresh token errors in console
    debug: false
  },
  global: {
    // Suppress error logs for refresh token issues
    headers: {
      'X-Client-Info': 'legal-chatbot'
    }
  }
})

// Override console.error để filter out refresh token errors
// Chỉ chạy một lần và an toàn cho hydration - dùng useEffect để chạy sau khi component mount
if (typeof window !== 'undefined') {
  // Chạy sau khi DOM đã load để tránh hydration error
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupConsoleErrorOverride()
    })
  } else {
    // DOM đã load, chạy ngay nhưng dùng setTimeout để tránh hydration
    setTimeout(setupConsoleErrorOverride, 0)
  }
}

function setupConsoleErrorOverride() {
  // Kiểm tra xem đã override chưa để tránh override nhiều lần
  if (!(console.error as any).__supabase_override__) {
    const originalError = console.error
    const wrappedError = (...args: any[]) => {
      const errorMessage = args.join(' ')
      // Bỏ qua các lỗi refresh token
      if (errorMessage.includes('Refresh Token') || 
          errorMessage.includes('refresh_token') ||
          errorMessage.includes('Invalid Refresh Token')) {
        return // Không log error này
      }
      // Bỏ qua các lỗi liên quan đến user bị ban (expected behavior)
      if (errorMessage.includes('User is banned') || 
          errorMessage.includes('user is banned') ||
          (errorMessage.includes('banned') && errorMessage.includes('logout'))) {
        return // Không log error này
      }
      originalError.apply(console, args)
    }
    // Đánh dấu đã override
    ;(wrappedError as any).__supabase_override__ = true
    console.error = wrappedError
  }
}

// For server-side operations that need elevated permissions
// Note: SUPABASE_SERVICE_ROLE_KEY không có prefix NEXT_PUBLIC_ nên chỉ có ở server-side
// CHỈ init supabaseAdmin ở server-side để tránh lỗi ở client-side

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null
                                      
function getSupabaseAdmin() {
  // Nếu đã init rồi thì return
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  // CHỈ init ở server-side (không có window object)
  if (typeof window === 'undefined') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('⚠️ Missing SUPABASE_SERVICE_ROLE_KEY. Please check .env.local file.')
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Please check .env.local file and restart dev server.')
    }

    supabaseAdminInstance = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    return supabaseAdminInstance
  }


  // Ở client-side, throw error nếu cố dùng (không nên dùng supabaseAdmin ở client)
  throw new Error('supabaseAdmin can only be used on the server-side. Use supabase for client-side operations.')
}

// Export như getter để lazy load (chỉ init khi gọi, không init khi import)
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const admin = getSupabaseAdmin()
    const value = (admin as any)[prop]
    // Nếu là function thì bind context
    if (typeof value === 'function') {
      return value.bind(admin)
    }
    return value
  }
})

// Database types
export interface Law {
  id: number

  _id: string | null
  category: string | null
  danh_sach_bang: string | null
  link: string | null
  loai_van_ban: string | null
  ngay_ban_hanh: string | null
  ngay_cong_bao: string | null
  ngay_hieu_luc: string | null
  nguoi_ky: string | null
  noi_ban_hanh: string | null
  noi_dung: string | null
  noi_dung_html: string | null
  so_cong_bao: string | null
  so_hieu: string | null
  thuoc_tinh_html: string | null
  tinh_trang: string | null
  title: string | null
  tom_tat: string | null
  tom_tat_html: string | null
  van_ban_duoc_dan: string | null
  embedding: number[] | null
  created_at: string
  updated_at: string

}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'editor' | 'user'
  created_at: string
  updated_at: string
}

export interface QueryLog {
  id: string // UUID
  user_id: string | null
  query: string
  matched_ids: string[] | null // UUID[]
  response: string | null
  created_at: string
}