import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Tạo Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function để lấy user_id từ request
async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  try {
    // Thử lấy từ authorization header trước
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) return user.id
    }

    // Nếu không có authorization header, lấy từ cookies
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch (error) {
    return null
  }
}

interface LawData {
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
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Không có file được upload' },
        { status: 400 }
      )
    }

    // Kiểm tra định dạng file
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.json')) {
      return NextResponse.json(
        { success: false, error: 'Chỉ chấp nhận file JSON (.json)' },
        { status: 400 }
      )
    }

    // Đọc file
    let text: string
    try {
      text = await file.text()
      
      // Kiểm tra nếu file bắt đầu với "PK" (ZIP file) hoặc các định dạng không phải text
      if (text.trim().startsWith('PK') || text.length < 10) {
        return NextResponse.json(
          { success: false, error: 'File không phải là JSON hợp lệ. Vui lòng kiểm tra lại file đã download. File có thể bị lỗi hoặc là file ZIP.' },
          { status: 400 }
        )
      }
    } catch (readError: any) {
      return NextResponse.json(
        { success: false, error: 'Không thể đọc file: ' + readError.message },
        { status: 400 }
      )
    }

    let lawsData: LawData[]

    try {
      // Thử parse JSON với validation tốt hơn
      const trimmedText = text.trim()
      if (!trimmedText.startsWith('[') && !trimmedText.startsWith('{')) {
        return NextResponse.json(
          { success: false, error: 'File JSON phải bắt đầu bằng "[" hoặc "{"' },
          { status: 400 }
        )
      }

      const parsed = JSON.parse(trimmedText)
      
      // Hỗ trợ cả array và object có key 'laws'
      if (Array.isArray(parsed)) {
        lawsData = parsed
      } else if (parsed.laws && Array.isArray(parsed.laws)) {
        lawsData = parsed.laws
      } else {
        return NextResponse.json(
          { success: false, error: 'File JSON phải là array hoặc object có key "laws"' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      // Kiểm tra lỗi cụ thể
      if (error.message.includes('Unexpected token')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'File JSON không hợp lệ. File có thể bị lỗi hoặc không phải file JSON. Vui lòng tải lại file mẫu từ nút "Download file mẫu" trong Admin Panel.' 
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'File JSON không hợp lệ: ' + error.message },
        { status: 400 }
      )
    }

    if (lawsData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File không chứa dữ liệu' },
        { status: 400 }
      )
    }

    // Validate và chuẩn hóa dữ liệu
    const validatedLaws: any[] = []
    const errors: string[] = []

    for (let i = 0; i < lawsData.length; i++) {
      const law = lawsData[i]
      
      // Kiểm tra các trường bắt buộc (nếu có)
      if (!law.title && !law.so_hieu) {
        errors.push(`Dòng ${i + 1}: Thiếu title hoặc so_hieu`)
        continue
      }

      // Chuẩn hóa dữ liệu
      const validatedLaw: any = {
        _id: law._id || null,
        category: law.category || null,
        danh_sach_bang: law.danh_sach_bang || null,
        link: law.link || null,
        loai_van_ban: law.loai_van_ban || null,
        ngay_ban_hanh: law.ngay_ban_hanh || null,
        ngay_cong_bao: law.ngay_cong_bao || null,
        ngay_hieu_luc: law.ngay_hieu_luc || null,
        nguoi_ky: law.nguoi_ky || null,
        noi_ban_hanh: law.noi_ban_hanh || null,
        noi_dung: law.noi_dung || null,
        noi_dung_html: law.noi_dung_html || null,
        so_cong_bao: law.so_cong_bao || null,
        so_hieu: law.so_hieu || null,
        thuoc_tinh_html: law.thuoc_tinh_html || null,
        tinh_trang: law.tinh_trang || null,
        title: law.title || law.so_hieu || 'Không có tiêu đề',
        tom_tat: law.tom_tat || null,
        tom_tat_html: law.tom_tat_html || null,
        van_ban_duoc_dan: law.van_ban_duoc_dan || null,
        updated_at: new Date().toISOString()
      }

      validatedLaws.push(validatedLaw)
    }

    if (validatedLaws.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Không có dữ liệu hợp lệ để import',
          errors 
        },
        { status: 400 }
      )
    }

    // Insert vào database (batch insert)
    const batchSize = 100
    let inserted = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < validatedLaws.length; i += batchSize) {
      const batch = validatedLaws.slice(i, i + batchSize)
      
      // Sử dụng upsert để tránh trùng lặp
      // Supabase không hỗ trợ onConflict trực tiếp, nên dùng insert và bỏ qua lỗi duplicate
      // Hoặc check trước rồi insert/update
      const { data, error } = await supabaseAdmin
        .from('laws')
        .upsert(batch)
        .select()

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        failed += batch.length
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
      } else {
        // Kiểm tra số lượng inserted vs updated
        // (Supabase upsert sẽ trả về cả insert và update)
        inserted += data?.length || 0
      }
    }

    // Log upload laws action (chỉ log nếu có user_id và user là admin/editor)
    const userId = await getUserIdFromRequest(req)
    if (userId) {
      try {
        // Kiểm tra role của user
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        // Chỉ log nếu user là admin hoặc editor
        if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'editor')) {
          const clientIP = req.headers.get('x-forwarded-for') || 
                          req.headers.get('x-real-ip') || 
                          'unknown'
          const clientUserAgent = req.headers.get('user-agent') || 'unknown'

          await supabaseAdmin.rpc('log_user_activity', {
            p_user_id: userId,
            p_activity_type: 'admin_action',
            p_action: 'upload_laws',
            p_details: {
              fileName: file.name,
              fileSize: file.size,
              total: lawsData.length,
              validated: validatedLaws.length,
              inserted: inserted,
              failed: failed
            },
            p_ip_address: clientIP,
            p_user_agent: clientUserAgent,
            p_risk_level: 'medium' // Upload laws là hành động quan trọng
          } as any)
        }
      } catch (logError) {
        console.error('Failed to log upload laws activity:', logError)
        // Không throw - logging không nên làm gián đoạn flow chính
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import thành công`,
      stats: {
        total: lawsData.length,
        validated: validatedLaws.length,
        inserted: inserted,
        failed: failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // Chỉ trả về 10 lỗi đầu
      }
    })

  } catch (error: any) {
    console.error('Upload laws error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi không xác định' },
      { status: 500 }
    )
  }
}

