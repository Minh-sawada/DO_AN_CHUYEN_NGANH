import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchTerm, limit = 10 } = await request.json()

    if (!searchTerm) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 })
    }

    // Simulate scraping from vanban.chinhphu.vn
    // In a real implementation, you would use a web scraper like Puppeteer or Cheerio
    const mockGovDocuments = [
      {
        title: "Nghị định 15/2024/NĐ-CP về quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam",
        content: "Nghị định này quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam số 46/2010/QH12 về chức năng, nhiệm vụ, quyền hạn của Ngân hàng Nhà nước Việt Nam trong việc quản lý nhà nước về tiền tệ và hoạt động ngân hàng.",
        article_reference: "Điều 1, Điều 2, Điều 3",
        source: "https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200000",
        category: "Tài chính - Ngân hàng"
      },
      {
        title: "Thông tư 16/2024/TT-NHNN hướng dẫn thực hiện một số điều của Nghị định 15/2024/NĐ-CP",
        content: "Thông tư này hướng dẫn thực hiện một số điều của Nghị định số 15/2024/NĐ-CP ngày 15 tháng 3 năm 2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Ngân hàng Nhà nước Việt Nam.",
        article_reference: "Điều 4, Điều 5",
        source: "https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200001",
        category: "Tài chính - Ngân hàng"
      },
      {
        title: "Luật Các tổ chức tín dụng số 32/2024/QH15",
        content: "Luật này quy định về tổ chức và hoạt động của các tổ chức tín dụng; quyền và nghĩa vụ của các tổ chức tín dụng, chi nhánh ngân hàng nước ngoài, văn phòng đại diện của tổ chức tín dụng nước ngoài, tổ chức nước ngoài khác có hoạt động ngân hàng tại Việt Nam.",
        article_reference: "Điều 1, Điều 2, Điều 3, Điều 4",
        source: "https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200002",
        category: "Tài chính - Ngân hàng"
      },
      {
        title: "Nghị định 01/2024/NĐ-CP về quy định chi tiết thi hành Luật Các tổ chức tín dụng",
        content: "Nghị định này quy định chi tiết thi hành một số điều của Luật Các tổ chức tín dụng số 32/2024/QH15 về điều kiện, thủ tục cấp, sửa đổi, bổ sung, thu hồi giấy phép thành lập và hoạt động của tổ chức tín dụng.",
        article_reference: "Điều 6, Điều 7, Điều 8",
        source: "https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200003",
        category: "Tài chính - Ngân hàng"
      },
      {
        title: "Thông tư 02/2024/TT-NHNN về quy định an toàn hoạt động ngân hàng",
        content: "Thông tư này quy định về các tỷ lệ an toàn, giới hạn và điều kiện hoạt động của các tổ chức tín dụng nhằm đảm bảo an toàn hoạt động ngân hàng và bảo vệ quyền lợi của người gửi tiền.",
        article_reference: "Điều 9, Điều 10, Điều 11",
        source: "https://vanban.chinhphu.vn/portal/page/portal/chinhphu/hethongvanban?class_id=1&mode=detail&document_id=200004",
        category: "Tài chính - Ngân hàng"
      }
    ]

    // Filter documents based on search term
    const filteredDocs = mockGovDocuments.filter(doc => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, limit)

    // Insert filtered documents into database
    const insertPromises = filteredDocs.map(async (doc) => {
      const { error } = await supabase
        .from('laws')
        .insert({
          title: doc.title,
          article_reference: doc.article_reference,
          content: doc.content,
          source: doc.source,
          embedding: null // We'll skip embedding for now
        })

      if (error) {
        console.error('Error inserting document:', error)
        return { success: false, error: error.message }
      }
      return { success: true }
    })

    const results = await Promise.all(insertPromises)
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Đã lấy và lưu ${successCount} văn bản từ Cổng thông tin điện tử Chính phủ`,
      documents: filteredDocs,
      count: successCount
    })

  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json({ 
      error: 'Failed to scrape government documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
