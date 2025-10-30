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
          id: number
          title: string
          content: string
          encrypted_content: string | null
          content_iv: string | null
          embedding: number[] | null
          metadata: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          title: string
          content: string
          encrypted_content?: string | null
          content_iv?: string | null
          embedding?: number[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          content?: string
          encrypted_content?: string | null
          content_iv?: string | null
          embedding?: number[] | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      query_logs: {
        Row: {
          id: number
          user_id: string
          query: string
          matched_ids: number[] | null
          response: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          query: string
          matched_ids?: number[] | null
          response?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          query?: string
          matched_ids?: number[] | null
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