import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Tạo Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tên file' },
        { status: 400 }
      )
    }

    // Download file từ storage
    const { data, error } = await supabaseAdmin.storage
      .from('backups')
      .download(filename)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Convert blob to text
    const text = await data.text()
    
    // Parse JSON
    let backupData: any
    try {
      backupData = JSON.parse(text)
    } catch (e) {
      return NextResponse.json({
        success: true,
        raw: text,
        isJSON: false,
        size: text.length
      })
    }

    // Kiểm tra nếu file đã được mã hóa
    if (backupData.encrypted) {
      return NextResponse.json({
        success: true,
        encrypted: true,
        metadata: backupData.metadata || {},
        hasEncryptedData: !!backupData.encrypted,
        encryptedLength: backupData.encrypted?.length || 0,
        message: 'File đã được mã hóa. Cần giải mã để xem nội dung.',
        note: 'Để giải mã, cần encryption key. Nếu bạn có key, có thể sử dụng utility script.'
      })
    }

    // Nếu không mã hóa, trả về dữ liệu
    return NextResponse.json({
      success: true,
      encrypted: false,
      data: backupData,
      size: text.length,
      keys: Object.keys(backupData)
    })

  } catch (error: any) {
    console.error('Download backup file error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi không xác định' },
      { status: 500 }
    )
  }
}

