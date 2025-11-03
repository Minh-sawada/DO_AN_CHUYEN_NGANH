import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Tạo Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    // Lấy danh sách files từ storage bucket
    const { data: files, error } = await supabaseAdmin.storage
      .from('backups')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Lấy metadata từ backup_logs
    const { data: logs } = await supabaseAdmin
      .from('backup_logs')
      .select('id, file_name, file_size, status, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(100)

    // Map files với logs
    const filesWithMetadata = (files || []).map(file => {
      const log = logs?.find(l => l.file_name === file.name)
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at || log?.created_at,
        updated_at: file.updated_at,
        id: log?.id,
        status: log?.status || 'unknown',
        file_size: log?.file_size || file.metadata?.size
      }
    })

    return NextResponse.json({
      success: true,
      files: filesWithMetadata,
      total: filesWithMetadata.length
    })

  } catch (error: any) {
    console.error('List backup files error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi không xác định' },
      { status: 500 }
    )
  }
}

