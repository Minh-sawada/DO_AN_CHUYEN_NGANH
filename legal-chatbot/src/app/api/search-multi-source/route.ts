import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { query, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const results = {
      local: [],
      thuvienphapluat: [],
      vanbanchinhphu: [],
      total: 0
    }

    // 1. Tìm kiếm trong database local
    try {
      const { data: localResults, error: localError } = await supabase
        .from('laws')
        .select('*')
        .or(`content.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(limit)

      if (!localError && localResults) {
        results.local = localResults.map(law => ({
          id: law.id,
          title: law.title,
          content: law.content,
          article_reference: law.article_reference,
          source: law.source,
          category: law.category || 'Local Database',
          similarity: 1.0 // Local results get highest priority
        }))
      }
    } catch (error) {
      console.error('Error searching local database:', error)
    }

    // 2. Tìm kiếm từ Thư viện Pháp luật (thuvienphapluat.vn)
    try {
      const thuvienphapluatResults = await searchThuvienphapluat(query, limit)
      results.thuvienphapluat = thuvienphapluatResults
    } catch (error) {
      console.error('Error searching Thư viện Pháp luật:', error)
    }

    // 3. Tìm kiếm từ Cổng thông tin điện tử Chính phủ (vanban.chinhphu.vn)
    try {
      const vanbanchinhphuResults = await searchVanbanchinhphu(query, limit)
      results.vanbanchinhphu = vanbanchinhphuResults
    } catch (error) {
      console.error('Error searching Cổng thông tin điện tử Chính phủ:', error)
    }

    // Tính tổng kết quả
    results.total = results.local.length + results.thuvienphapluat.length + results.vanbanchinhphu.length

    return NextResponse.json({
      success: true,
      results,
      query,
      total: results.total
    })

  } catch (error) {
    console.error('Error in multi-source search:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Hàm tìm kiếm từ Thư viện Pháp luật
async function searchThuvienphapluat(query: string, limit: number) {
  try {
    // Mock data cho Thư viện Pháp luật (trong thực tế sẽ gọi API thật)
    const mockResults = [
      {
        id: 'tvpl_001',
        title: 'Luật Ngân hàng Nhà nước Việt Nam số 46/2010/QH12',
        content: 'Luật này quy định về tổ chức và hoạt động của Ngân hàng Nhà nước Việt Nam, chức năng, nhiệm vụ, quyền hạn của Ngân hàng Nhà nước trong việc quản lý nhà nước về tiền tệ và hoạt động ngân hàng.',
        article_reference: 'Điều 1, Điều 2, Điều 3',
        source: 'https://thuvienphapluat.vn/van-ban/Ngan-hang/Luat-Ngan-hang-Nha-nuoc-Viet-Nam-2010-46-2010-QH12-110728.aspx',
        category: 'Ngân hàng',
        similarity: 0.9
      },
      {
        id: 'tvpl_002',
        title: 'Nghị định 01/2024/NĐ-CP về quy định chi tiết thi hành Luật Các tổ chức tín dụng',
        content: 'Nghị định này quy định chi tiết thi hành một số điều của Luật Các tổ chức tín dụng số 32/2024/QH15 về điều kiện, thủ tục cấp, sửa đổi, bổ sung, thu hồi giấy phép thành lập và hoạt động của tổ chức tín dụng.',
        article_reference: 'Điều 6, Điều 7, Điều 8',
        source: 'https://thuvienphapluat.vn/van-ban/Ngan-hang/Nghi-dinh-01-2024-ND-CP-quy-dinh-chi-tiet-thi-hanh-Luat-Cac-to-chuc-tin-dung-2024-01-2024-ND-CP-678123.aspx',
        category: 'Ngân hàng',
        similarity: 0.85
      },
      {
        id: 'tvpl_003',
        title: 'Thông tư 16/2024/TT-NHNN hướng dẫn thực hiện một số điều của Nghị định 15/2024/NĐ-CP',
        content: 'Thông tư này hướng dẫn thực hiện một số điều của Nghị định số 15/2024/NĐ-CP ngày 15 tháng 3 năm 2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam.',
        article_reference: 'Điều 4, Điều 5',
        source: 'https://thuvienphapluat.vn/van-ban/Ngan-hang/Thong-tu-16-2024-TT-NHNN-huong-dan-thuc-hien-mot-so-dieu-cua-Nghi-dinh-15-2024-ND-CP-2024-16-2024-TT-NHNN-678124.aspx',
        category: 'Ngân hàng',
        similarity: 0.8
      }
    ]

    // Lọc kết quả dựa trên query
    return mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.content.toLowerCase().includes(query.toLowerCase()) ||
      result.article_reference.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit)

  } catch (error) {
    console.error('Error searching Thư viện Pháp luật:', error)
    return []
  }
}

// Hàm tìm kiếm từ Cổng thông tin điện tử Chính phủ
async function searchVanbanchinhphu(query: string, limit: number) {
  try {
    // Mock data cho Cổng thông tin điện tử Chính phủ (trong thực tế sẽ gọi API thật)
    const mockResults = [
      {
        id: 'vbcp_001',
        title: 'Nghị định 15/2024/NĐ-CP về quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam',
        content: 'Nghị định này quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam số 46/2010/QH12 về chức năng, nhiệm vụ, quyền hạn của Ngân hàng Nhà nước Việt Nam trong việc quản lý nhà nước về tiền tệ và hoạt động ngân hàng.',
        article_reference: 'Điều 1, Điều 2, Điều 3',
        source: 'https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200000',
        category: 'Tài chính - Ngân hàng',
        similarity: 0.9
      },
      {
        id: 'vbcp_002',
        title: 'Luật Các tổ chức tín dụng số 32/2024/QH15',
        content: 'Luật này quy định về tổ chức và hoạt động của các tổ chức tín dụng; quyền và nghĩa vụ của các tổ chức tín dụng, chi nhánh ngân hàng nước ngoài, văn phòng đại diện của tổ chức tín dụng nước ngoài, tổ chức nước ngoài khác có hoạt động ngân hàng tại Việt Nam.',
        article_reference: 'Điều 1, Điều 2, Điều 3, Điều 4',
        source: 'https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200002',
        category: 'Tài chính - Ngân hàng',
        similarity: 0.85
      },
      {
        id: 'vbcp_003',
        title: 'Thông tư 02/2024/TT-NHNN về quy định an toàn hoạt động ngân hàng',
        content: 'Thông tư này quy định về các tỷ lệ an toàn, giới hạn và điều kiện hoạt động của các tổ chức tín dụng nhằm đảm bảo an toàn hoạt động ngân hàng và bảo vệ quyền lợi của người gửi tiền.',
        article_reference: 'Điều 9, Điều 10, Điều 11',
        source: 'https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200004',
        category: 'Tài chính - Ngân hàng',
        similarity: 0.8
      }
    ]

    // Lọc kết quả dựa trên query
    return mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.content.toLowerCase().includes(query.toLowerCase()) ||
      result.article_reference.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit)

  } catch (error) {
    console.error('Error searching Cổng thông tin điện tử Chính phủ:', error)
    return []
  }
}
