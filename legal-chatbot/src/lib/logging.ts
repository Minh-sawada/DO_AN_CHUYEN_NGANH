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

// ⚠️ DEPRECATED: Function này không còn được dùng
// Chỉ dùng 2 bảng: query_logs và user_activities
// Nếu cần log system events, dùng user_activities với activity_type phù hợp
export async function logSystemEvent({
  user_id,
  level,
  category,
  action,
  details,
  error
}: SystemLog) {
  // Không dùng nữa - chỉ dùng user_activities
  console.warn('logSystemEvent is deprecated. Use user_activities instead.')
  
  // Nếu muốn log, dùng user_activities thay vì system_logs
  // await supabase.rpc('log_user_activity', {
  //   p_user_id: user_id,
  //   p_activity_type: 'admin_action', // hoặc activity type phù hợp
  //   p_action: action,
  //   p_details: details,
  //   p_risk_level: level === 'error' ? 'high' : 'low'
  // })
  
  return null
}