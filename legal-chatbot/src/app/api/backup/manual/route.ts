import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Tạo Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra backup settings
    let { data: settings, error: settingsError } = await supabaseAdmin
      .from('backup_settings')
      .select('*')
      .limit(1)
      .single()

    if (settingsError || !settings) {
      // Tạo cấu hình mặc định nếu chưa có
      const { error: insertError } = await supabaseAdmin
        .from('backup_settings')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          auto_backup_enabled: true,
          backup_frequency: 'daily',
          retention_days: 30,
          encryption_enabled: true,
          max_backup_size_mb: 50
        })

      if (insertError) {
        return NextResponse.json(
          { success: false, error: 'Không thể tạo cấu hình backup' },
          { status: 500 }
        )
      }

      // Lấy lại settings
      const { data: newSettings } = await supabaseAdmin
        .from('backup_settings')
        .select('*')
        .limit(1)
        .single()

      settings = newSettings
    }

    // 2. Export dữ liệu
    const { data: exportedData, error: exportError } = await supabaseAdmin
      .rpc('export_backup_data')

    if (exportError) {
      return NextResponse.json(
        { success: false, error: 'Lỗi export dữ liệu: ' + exportError.message },
        { status: 500 }
      )
    }

    if (!exportedData) {
      return NextResponse.json(
        { success: false, error: 'Không có dữ liệu để backup' },
        { status: 400 }
      )
    }

    // 3. Tạo backup log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json`
    const backupData = JSON.stringify(exportedData)
    const dataSize = Buffer.from(backupData, 'utf-8').length

    // Kiểm tra kích thước
    if (dataSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Backup quá lớn (${(dataSize / 1024 / 1024).toFixed(2)} MB). Giới hạn 50MB.` 
        },
        { status: 400 }
      )
    }

    // Tạo backup log với status 'processing'
    const { data: backupLog, error: logError } = await supabaseAdmin
      .from('backup_logs')
      .insert({
        backup_type: 'manual',
        file_name: filename,
        file_size: dataSize,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      return NextResponse.json(
        { success: false, error: 'Lỗi tạo backup log: ' + logError.message },
        { status: 500 }
      )
    }

    // 4. Upload lên Supabase Storage
    const buffer = Buffer.from(backupData, 'utf-8')
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(filename, buffer, {
        contentType: 'application/json',
        upsert: false
      })

    if (uploadError) {
      // Cập nhật log với lỗi
      await supabaseAdmin
        .from('backup_logs')
        .update({
          status: 'failed',
          error_message: uploadError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', backupLog.id)

      return NextResponse.json(
        { success: false, error: 'Lỗi upload: ' + uploadError.message },
        { status: 500 }
      )
    }

    // 5. Cập nhật backup log thành công
    await supabaseAdmin
      .from('backup_logs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString()
      })
      .eq('id', backupLog.id)

    return NextResponse.json({
      success: true,
      message: 'Backup thành công',
      data: {
        id: backupLog.id,
        filename,
        file_size: dataSize,
        file_path: uploadData.path,
        created_at: backupLog.created_at
      }
    })

  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi không xác định' },
      { status: 500 }
    )
  }
}

