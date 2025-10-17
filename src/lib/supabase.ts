import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ohbtiifdbixjxeqbnkrq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYnRpaWZkYml4anhlcWJua3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzQ1NDMsImV4cCI6MjA3Mzk1MDU0M30.GRiwvY43i_BV7BYh6g72zT_3uvKGNS6guCV-eBodx88'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations that need elevated permissions
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYnRpaWZkYml4anhlcWJua3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM3NDU0MywiZXhwIjoyMDczOTUwNTQzfQ.CJgDzlGJPP9Ycj0_YQt6aL0aAY7eFr_7YOMWZF9HR1g',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

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
  role: 'admin' | 'user'
  created_at: string
}

export interface QueryLog {
  id: number
  user_id: string | null
  query: string
  matched_ids: number[] | null
  response: string | null
  created_at: string
}
