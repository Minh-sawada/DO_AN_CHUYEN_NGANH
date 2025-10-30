import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface Source {
  id: string | number;
  title: string;
  article_reference: string | null;
  source: string;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { query, userId } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    // 1. Tìm kiếm trong database local trước
    const { data: localResults, error: localError } = await supabase
      .from('laws')
      .select('*')
      .or(`content.ilike.%${query}%,title.ilike.%${query}%`)
      .limit(5)

    let sources: Source[] = []
    let matched_ids: (string | number)[] = []
    let context = ""

    if (!localError && localResults && localResults.length > 0) {
      // Có kết quả từ database local
      sources = localResults.map(law => ({
        id: law.id,
        title: law.title,
        article_reference: law.article_reference,
        source: law.source,
        category: law.category || 'Local Database'
      }))
      
      matched_ids = localResults.map(law => law.id)
      
      context = localResults.map(law => 
        `Tiêu đề: ${law.title}\n` +
        `Điều/Khoản: ${law.article_reference || 'N/A'}\n` +
        `Nội dung: ${law.content}\n` +
        `Nguồn: ${law.source || 'N/A'}\n`
      ).join('\n---\n')
    } else {
      // Không có kết quả từ database local, tìm kiếm từ các nguồn khác
      const externalResults = await searchExternalSources(query)
      
      if (externalResults.length > 0) {
        sources = externalResults.map(result => ({
          id: result.id,
          title: result.title,
          article_reference: result.article_reference,
          source: result.source,
          category: result.category
        }))
        
        matched_ids = externalResults.map(result => result.id)
        
        context = externalResults.map(result => 
          `Tiêu đề: ${result.title}\n` +
          `Điều/Khoản: ${result.article_reference || 'N/A'}\n` +
          `Nội dung: ${result.content}\n` +
          `Nguồn: ${result.source}\n`
        ).join('\n---\n')
      }
    }

    // 2. Tạo response dựa trên context
    let response = ""
    
    if (context) {
      response = `Dựa trên các văn bản pháp luật liên quan, tôi có thể trả lời câu hỏi của bạn:\n\n${query}\n\nThông tin tham khảo từ các nguồn pháp luật:\n${context}\n\nLưu ý: Đây là thông tin tham khảo, bạn nên tham khảo thêm ý kiến của luật sư hoặc cơ quan có thẩm quyền để có lời khuyên chính xác nhất.`
    } else {
      response = `Xin lỗi, tôi không tìm thấy thông tin pháp luật cụ thể liên quan đến câu hỏi "${query}" trong cơ sở dữ liệu hiện tại. Bạn có thể:\n\n1. Thử diễn đạt câu hỏi theo cách khác\n2. Liên hệ với luật sư để được tư vấn chuyên sâu\n3. Tham khảo các nguồn pháp luật chính thức như:\n   - Thư viện Pháp luật (thuvienphapluat.vn)\n   - Cổng thông tin điện tử Chính phủ (vanban.chinhphu.vn)`
    }

    // 3. Lưu query log
    try {
      await supabase.from('query_logs').insert({
        query: query,
        response: response,
        user_id: userId || null,
        sources_count: sources.length
      })
    } catch (logError) {
      console.error('Error logging query:', logError)
    }

    return NextResponse.json({
      response: response,
      sources: sources,
      matched_ids: matched_ids,
      total_sources: sources.length,
      search_method: localResults && localResults.length > 0 ? 'local' : 'external'
    })

  } catch (error) {
    console.error('Error in enhanced chat:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      response: 'Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
    }, { status: 500 })
  }
}

// Hàm tìm kiếm từ các nguồn bên ngoài
async function searchExternalSources(query: string) {
  const results = []

  try {
    // Tìm kiếm từ Thư viện Pháp luật
    const thuvienphapluatResults = await searchThuvienphapluat(query, 3)
    results.push(...thuvienphapluatResults)

    // Tìm kiếm từ Cổng thông tin điện tử Chính phủ
    const vanbanchinhphuResults = await searchVanbanchinhphu(query, 3)
    results.push(...vanbanchinhphuResults)

  } catch (error) {
    console.error('Error searching external sources:', error)
  }

  return results
}

// Hàm tìm kiếm từ Thư viện Pháp luật
async function searchThuvienphapluat(query: string, limit: number) {
  try {
    // Mock data cho Thư viện Pháp luật
    const mockResults = [
      {
        id: 'tvpl_001',
        title: 'Luật Ngân hàng Nhà nước Việt Nam số 46/2010/QH12',
        content: 'Luật này quy định về tổ chức và hoạt động của Ngân hàng Nhà nước Việt Nam, chức năng, nhiệm vụ, quyền hạn của Ngân hàng Nhà nước trong việc quản lý nhà nước về tiền tệ và hoạt động ngân hàng.',
        article_reference: 'Điều 1, Điều 2, Điều 3',
        source: 'https://thuvienphapluat.vn/van-ban/Ngan-hang/Luat-Ngan-hang-Nha-nuoc-Viet-Nam-2010-46-2010-QH12-110728.aspx',
        category: 'Ngân hàng'
      },
      {
        id: 'tvpl_002',
        title: 'Nghị định 01/2024/NĐ-CP về quy định chi tiết thi hành Luật Các tổ chức tín dụng',
        content: 'Nghị định này quy định chi tiết thi hành một số điều của Luật Các tổ chức tín dụng số 32/2024/QH15 về điều kiện, thủ tục cấp, sửa đổi, bổ sung, thu hồi giấy phép thành lập và hoạt động của tổ chức tín dụng.',
        article_reference: 'Điều 6, Điều 7, Điều 8',
        source: 'https://thuvienphapluat.vn/van-ban/Ngan-hang/Nghi-dinh-01-2024-ND-CP-quy-dinh-chi-tiet-thi-hanh-Luat-Cac-to-chuc-tin-dung-2024-01-2024-ND-CP-678123.aspx',
        category: 'Ngân hàng'
      }
    ]

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
    // Mock data cho Cổng thông tin điện tử Chính phủ
    const mockResults = [
      {
        id: 'vbcp_001',
        title: 'Nghị định 15/2024/NĐ-CP về quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam',
        content: 'Nghị định này quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam số 46/2010/QH12 về chức năng, nhiệm vụ, quyền hạn của Ngân hàng Nhà nước Việt Nam trong việc quản lý nhà nước về tiền tệ và hoạt động ngân hàng.',
        article_reference: 'Điều 1, Điều 2, Điều 3',
        source: 'https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200000',
        category: 'Tài chính - Ngân hàng'
      },
      {
        id: 'vbcp_002',
        title: 'Luật Các tổ chức tín dụng số 32/2024/QH15',
        content: 'Luật này quy định về tổ chức và hoạt động của các tổ chức tín dụng; quyền và nghĩa vụ của các tổ chức tín dụng, chi nhánh ngân hàng nước ngoài, văn phòng đại diện của tổ chức tín dụng nước ngoài, tổ chức nước ngoài khác có hoạt động ngân hàng tại Việt Nam.',
        article_reference: 'Điều 1, Điều 2, Điều 3, Điều 4',
        source: 'https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200002',
        category: 'Tài chính - Ngân hàng'
      }
    ]

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
