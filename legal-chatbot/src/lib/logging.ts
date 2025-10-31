import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogCategory {
  AUTH = 'auth',
  FILE_UPLOAD = 'file_upload',
  CHAT = 'chat',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

export interface SystemLog {
  user_id?: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  details?: any;
  error?: any;
}

export async function logSystemEvent({
  user_id,
  level,
  category,
  action,
  details,
  error
}: SystemLog) {
  try {
    // ensure the payload matches your generated DB types when available, fall back to `any` to avoid the "never" error
    type SystemLogsInsert = Database['public']['Tables']['system_logs']['Insert'];

    const payload = {
        user_id,
        level,
        category,
        action,
        details,
        error: error ? JSON.stringify(error) : null,
        created_at: new Date().toISOString()
    } as unknown as SystemLogsInsert;

    // cast to `any` for the insert call to avoid the "never" type issue if your DB type is not set up exactly
    const { data, error: dbError } = await supabase
        .from('system_logs')
        .insert([payload] as any);

    if (dbError) throw dbError;
    return data;
  } catch (err) {
    console.error('Failed to log system event:', err);
    // Don't throw - logging should not break the main flow
  }
}

// Usage example:
/*
await logSystemEvent({
  user_id: 'user123',
  level: LogLevel.INFO,
  category: LogCategory.FILE_UPLOAD,
  action: 'upload_document',
  details: { fileName: 'example.pdf', size: 1024 }
});
*/