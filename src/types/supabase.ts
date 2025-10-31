export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      laws: {
        Row: {
          id: number // BIGSERIAL
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
        Insert: {
          id?: number
          _id?: string | null
          category?: string | null
          danh_sach_bang?: string | null
          link?: string | null
          loai_van_ban?: string | null
          ngay_ban_hanh?: string | null
          ngay_cong_bao?: string | null
          ngay_hieu_luc?: string | null
          nguoi_ky?: string | null
          noi_ban_hanh?: string | null
          noi_dung?: string | null
          noi_dung_html?: string | null
          so_cong_bao?: string | null
          so_hieu?: string | null
          thuoc_tinh_html?: string | null
          tinh_trang?: string | null
          title?: string | null
          tom_tat?: string | null
          tom_tat_html?: string | null
          van_ban_duoc_dan?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          _id?: string | null
          category?: string | null
          danh_sach_bang?: string | null
          link?: string | null
          loai_van_ban?: string | null
          ngay_ban_hanh?: string | null
          ngay_cong_bao?: string | null
          ngay_hieu_luc?: string | null
          nguoi_ky?: string | null
          noi_ban_hanh?: string | null
          noi_dung?: string | null
          noi_dung_html?: string | null
          so_cong_bao?: string | null
          so_hieu?: string | null
          thuoc_tinh_html?: string | null
          tinh_trang?: string | null
          title?: string | null
          tom_tat?: string | null
          tom_tat_html?: string | null
          van_ban_duoc_dan?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string // UUID
          full_name: string | null
          role: string // 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string // UUID
          full_name?: string | null
          role?: string // 'admin' | 'user', default 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string // 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      query_logs: {
        Row: {
          id: string // UUID
          user_id: string | null // UUID, nullable
          query: string
          matched_ids: string[] | null // UUID[]
          response: string | null
          created_at: string
        }
        Insert: {
          id?: string // UUID, auto-generated if not provided
          user_id?: string | null // UUID
          query: string
          matched_ids?: string[] | null // UUID[]
          response?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          query?: string
          matched_ids?: string[] | null // UUID[]
          response?: string | null
          created_at?: string
        }
      }
      system_logs: {
        Row: {
          id: number
          user_id: string | null
          level: string
          category: string
          action: string
          details: Json | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          level: string
          category: string
          action: string
          details?: Json | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          level?: string
          category?: string
          action?: string
          details?: Json | null
          error?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      match_documents: {
        Args: { query_embedding: number[] }
        Returns: { id: number; content: string; similarity: number }[]
      }
    }
  }
}