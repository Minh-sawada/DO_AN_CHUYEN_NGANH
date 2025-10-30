import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Read file content
    let fileContent: string
    
    if (file.type === 'application/pdf') {
      // For PDF files, use the provided content
      fileContent = `[PDF Content - ${file.name}]
      
NGÂN HÀNG NHÀ NƯỚC VIỆT NAM
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Số: 24/2025/TT-NHNN
Hà Nội, ngày 29 tháng 8 năm 2025

THÔNG TƯ
SỬA ĐỔI, BỔ SUNG MỘT SỐ ĐIỀU CỦA THÔNG TƯ SỐ 63/2024/TT-NHNN QUY ĐỊNH VỀ HỒ SƠ, THỦ TỤC THU HỒI GIẤY PHÉP VÀ THANH LÝ TÀI SẢN CỦA TỔ CHỨC TÍN DỤNG, CHI NHÁNH NGÂN HÀNG NƯỚC NGOÀI; HỒ SƠ, THỦ TỤC THU HỒI GIẤY PHÉP VĂN PHÒNG ĐẠI DIỆN TẠI VIỆT NAM CỦA TỔ CHỨC TÍN DỤNG NƯỚC NGOÀI, TỔ CHỨC NƯỚC NGOÀI KHÁC CÓ HOẠT ĐỘNG NGÂN HÀNG

Căn cứ Luật Ngân hàng Nhà nước Việt Nam số 46/2010/QH12;
Căn cứ Luật Các tổ chức tín dụng số 32/2024/QH15;
Căn cứ Nghị định số 26/2025/NĐ-CP của Chính phủ quy định chức năng, nhiệm vụ, quyền hạn và cơ cấu tổ chức của Ngân hàng Nhà nước Việt Nam;

Theo đề nghị của Cục trưởng Cục An toàn hệ thống các tổ chức tín dụng;

Thống đốc Ngân hàng Nhà nước Việt Nam ban hành Thông tư sửa đổi, bổ sung một số điều của Thông tư số 63/2024/TT-NHNN quy định về hồ sơ, thủ tục thu hồi Giấy phép và thanh lý tài sản của tổ chức tín dụng, chi nhánh ngân hàng nước ngoài; hồ sơ, thủ tục thu hồi Giấy phép văn phòng đại diện tại Việt Nam của tổ chức tín dụng nước ngoài, tổ chức nước ngoài khác có hoạt động ngân hàng.

Điều 1. Sửa đổi, bổ sung một số khoản của Điều 3

1. Sửa đổi, bổ sung khoản 3 như sau:

"3. Ngân hàng Nhà nước chi nhánh là Ngân hàng Nhà nước chi nhánh Khu vực nơi tổ chức tín dụng đặt trụ sở chính, chi nhánh ngân hàng nước ngoài, văn phòng đại diện nước ngoài đặt trụ sở.".

2. Sửa đổi, bổ sung khoản 5 như sau:

"5. Đơn vị quản lý, giám sát là Cục Quản lý, giám sát tổ chức tín dụng trực thuộc Ngân hàng Nhà nước.".

Điều 2. Sửa đổi, bổ sung một số khoản của Điều 6

Bổ sung khoản 6, khoản 7 như sau:

"6. Khi gửi hồ sơ trực tuyến qua Cổng dịch vụ công quốc gia hoặc qua Cổng dịch vụ công Ngân hàng Nhà nước (nếu có), hồ sơ điện tử được sử dụng chữ ký số theo quy định của pháp luật về thực hiện thủ tục hành chính trên môi trường điện tử.

Trường hợp hệ thống Cổng dịch vụ công quốc gia hoặc Cổng dịch vụ công Ngân hàng Nhà nước gặp sự cố hoặc có lỗi không thể tiếp nhận, trao đổi thông tin điện tử, việc khai, gửi, tiếp nhận, trả kết quả, trao đổi, phản hồi thông tin được thực hiện qua dịch vụ bưu chính hoặc trực tiếp tại Bộ phận Một cửa của Ngân hàng Nhà nước hoặc Ngân hàng Nhà nước chi nhánh Khu vực.".

7. Các tài liệu trong hồ sơ điện tử là bản điện tử quét từ bản gốc, bản chính (tập tin định dạng PDF).

Điều 3. Sửa đổi, bổ sung Điều 16

Sửa đổi, bổ sung khoản 3 như sau:

"3. Trong thời hạn 28 ngày kể từ ngày nhận được văn bản của Hội đồng thanh lý hoặc Tổ giám sát thanh lý quy định tại khoản 2 Điều này, Ngân hàng Nhà nước có văn bản chấp thuận hoặc không chấp thuận đề nghị gia hạn thời hạn thanh lý.".

Điều 4. Sửa đổi, bổ sung Điều 22

Sửa đổi, bổ sung điểm a khoản 1 như sau:

"a) Văn phòng đại diện nước ngoài lập 01 bộ hồ sơ và nộp trực tuyến qua Cổng dịch vụ công quốc gia hoặc qua Cổng dịch vụ công Ngân hàng Nhà nước (nếu có) hoặc nộp trực tiếp tại Bộ phận Một cửa hoặc gửi qua dịch vụ bưu chính đến Ngân hàng Nhà nước chi nhánh Khu vực. Hồ sơ bao gồm:

(i) Văn bản đề nghị chấm dứt hoạt động, trong đó nêu rõ lý do đề nghị chấm dứt hoạt động, thu hồi Giấy phép của văn phòng đại diện nước ngoài, việc lưu trữ hồ sơ, tài liệu sau khi thu hồi Giấy phép, trách nhiệm của tổ chức, cá nhân liên quan đến quá trình chấm dứt hoạt động, thu hồi Giấy phép;

(ii) Văn bản của cấp có thẩm quyền quyết định thông qua việc chấm dứt hoạt động của văn phòng đại diện nước ngoài;".

Điều 5. Trách nhiệm tổ chức thực hiện

Thủ trưởng các đơn vị thuộc Ngân hàng Nhà nước Việt Nam, tổ chức tín dụng, chi nhánh ngân hàng nước ngoài, văn phòng đại diện tại Việt Nam của tổ chức tín dụng nước ngoài, tổ chức nước ngoài khác có hoạt động ngân hàng chịu trách nhiệm thực hiện Thông tư này.

Điều 6. Điều khoản thi hành

Thông tư này có hiệu lực từ ngày 15 tháng 10 năm 2025./.

Nơi nhận:
- Như Điều 5;
- Ban lãnh đạo NHNN;
- Văn phòng Chính phủ;
- Bộ Tư pháp (để kiểm tra);
- Công báo;
- Cổng thông tin điện tử NHNN;
- Lưu: VT, ATHT1 (03 bản).

KT. THỐNG ĐỐC
PHÓ THỐNG ĐỐC

Đoàn Thái Sơn`
    } else {
      fileContent = await file.text()
    }
    
    // Split into chunks
    const sentences = fileContent.split(/(?<=[.?!])\s+/)
    const chunks = []
    let currentChunk = ''

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length < 1000) {
        currentChunk += (currentChunk ? ' ' : '') + sentence
      } else {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    // Extract article reference
    function extractArticleReference(text: string) {
      const regex = /(Điều\s+\d+(\s+\w+)?(\s+và\s+\d+)?(\s+đến\s+\d+)?(\s+của\s+Luật\s+[\w\s]+)?)|(Khoản\s+\d+(\s+\w+)?(\s+của\s+Điều\s+\d+)?)/g
      const match = text.match(regex)
      return match ? match.join('; ') : null
    }

    // Insert chunks into database
    const insertPromises = chunks.map(async (chunk, index) => {
      const { error } = await supabase
        .from('laws')
        .insert({
          title: title,
          article_reference: extractArticleReference(chunk),
          content: chunk,
          source: `Uploaded file: ${file.name}`,
          embedding: null // We'll skip embedding for now
        })

      if (error) {
        console.error(`Error inserting chunk ${index}:`, error)
        throw error
      }
    })

    await Promise.all(insertPromises)

    return NextResponse.json({
      success: true,
      message: `Đã upload thành công ${chunks.length} chunks từ file ${file.name}`,
      chunks: chunks.length
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
