import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations that need elevated permissions
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
  title: string | null
  article_reference: string | null
  source: string | null
  content: string
  embedding: number[] | null
  created_at: string
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
