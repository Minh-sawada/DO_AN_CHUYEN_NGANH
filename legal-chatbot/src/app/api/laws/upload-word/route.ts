import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Dynamic import cho các thư viện nặng
// Đảm bảo route này chạy ở Node.js runtime, không phải Edge
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 giây timeout

// Lazy load mammoth và pdf-parse để tối ưu bundle size
async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.default.extractRawText({ buffer })
  return result.value
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfParse = await import('pdf-parse')
  const pdfData = await pdfParse.default(buffer)
  return pdfData.text
}

// Tạo Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Không có file được upload' },
        { status: 400 }
      )
    }

    // Kiểm tra định dạng file
    const fileName = file.name.toLowerCase()
    const allowedExtensions = ['.doc', '.docx', '.pdf', '.txt', '.rtf']
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
    
    if (!isValidExtension) {
      return NextResponse.json(
        { success: false, error: `Chỉ chấp nhận file: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      )
    }

    // Đọc file thành buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse text từ file
    let extractedText = ''
    let extractedTitle = title || file.name.replace(/\.[^/.]+$/, '')

    // Hàm kiểm tra title có hợp lệ không (không chỉ là ký tự đặc biệt)
    function isValidTitle(line: string): boolean {
      const trimmed = line.trim()
      if (!trimmed || trimmed.length < 3 || trimmed.length > 200) {
        return false
      }
      // Loại bỏ các dòng chỉ có ký tự đặc biệt như [, ], {, }, (, ), -, _, ...
      const hasLetters = /[a-zA-ZÀ-ỹ]/.test(trimmed)
      const hasNumbers = /\d/.test(trimmed)
      // Phải có ít nhất chữ cái hoặc số, và không chỉ là ký tự đặc biệt
      if (!hasLetters && !hasNumbers) {
        return false
      }
      // Loại bỏ các dòng chỉ là 1-2 ký tự đặc biệt
      if (trimmed.length < 5 && /^[^\wÀ-ỹ]*$/.test(trimmed.replace(/\s/g, ''))) {
        return false
      }
      return true
    }

    // Hàm kiểm tra dòng có phải là title văn bản pháp luật không
    function isLawDocumentTitle(line: string): boolean {
      const trimmed = line.trim().toUpperCase()
      // Tìm các từ khóa văn bản pháp luật
      const lawKeywords = [
        'QUYẾT ĐỊNH',
        'NGHỊ ĐỊNH',
        'LUẬT',
        'KẾ HOẠCH',
        'THÔNG TƯ',
        'NGHỊ QUYẾT',
        'CHỈ THỊ',
        'PHÁP LỆNH',
        'LỆNH',
        'THÔNG BÁO',
        'CÔNG VĂN',
        'QUYẾT ĐỊNH SỐ',
        'NGHỊ ĐỊNH SỐ',
        'THÔNG TƯ SỐ',
        'NGHỊ QUYẾT SỐ'
      ]
      
      // Kiểm tra có chứa từ khóa pháp luật
      const hasLawKeyword = lawKeywords.some(keyword => trimmed.includes(keyword))
      
      // Kiểm tra có pattern số hiệu văn bản (ví dụ: 25/2017/QĐ-UBND)
      const hasLawNumberPattern = /\d{1,4}\/\d{4}\/(QĐ|NĐ|TT|NQ|KH|CT|PL|L)-[A-Z]+/.test(trimmed)
      
      return hasLawKeyword || hasLawNumberPattern
    }

    // Hàm tìm title tốt nhất từ các dòng
    function findBestTitle(lines: string[]): string {
      let bestTitle = ''
      let bestScore = 0
      
      // Tìm dòng có pattern văn bản pháp luật (ưu tiên cao nhất)
      for (const line of lines) {
        if (isValidTitle(line) && isLawDocumentTitle(line)) {
          const trimmed = line.trim()
          // Score cao nếu có từ khóa + số hiệu
          const score = (isLawDocumentTitle(trimmed) ? 10 : 0) + 
                       (/\d{1,4}\/\d{4}/.test(trimmed) ? 5 : 0) +
                       (trimmed.length > 20 && trimmed.length < 150 ? 3 : 0)
          
          if (score > bestScore) {
            bestScore = score
            bestTitle = trimmed
          }
        }
      }
      
      // Nếu tìm thấy title có pattern văn bản pháp luật, return ngay
      if (bestTitle && bestScore >= 10) {
        return bestTitle
      }
      
      // Nếu không tìm thấy, tìm dòng hợp lệ đầu tiên (dòng dài, có chữ cái)
      for (const line of lines) {
        if (isValidTitle(line)) {
          const trimmed = line.trim()
          // Ưu tiên dòng có độ dài hợp lý (20-150 ký tự)
          if (trimmed.length >= 20 && trimmed.length <= 150) {
            return trimmed
          }
          // Nếu chưa có title nào, lấy dòng này
          if (!bestTitle) {
            bestTitle = trimmed
          }
        }
      }
      
      return bestTitle
    }

    try {
      if (fileName.endsWith('.txt') || fileName.endsWith('.rtf')) {
        // Plain text hoặc RTF - thử nhiều encoding
        try {
          extractedText = buffer.toString('utf-8')
          // Remove BOM nếu có
          if (extractedText.charCodeAt(0) === 0xFEFF) {
            extractedText = extractedText.slice(1)
          }
        } catch (utf8Error) {
          try {
            extractedText = buffer.toString('latin1')
          } catch (latin1Error) {
            extractedText = buffer.toString('utf-16le')
          }
        }
        
        // Normalize line endings và spaces
        extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        // Loại bỏ các ký tự control không cần thiết (giữ lại \n và \t)
        extractedText = extractedText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        
        // Tìm title tốt nhất nếu chưa có title từ người dùng
        if (!title) {
          const lines = extractedText.split('\n').slice(0, 50) // Chỉ xem 50 dòng đầu
          const foundTitle = findBestTitle(lines)
          if (foundTitle) {
            extractedTitle = foundTitle
          }
        }
      } else if (fileName.endsWith('.docx')) {
        // DOCX file - sử dụng mammoth để parse
        try {
          extractedText = await parseDocx(buffer)
          
          // Normalize text
          if (extractedText) {
            extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
          }
          
          // Tìm title tốt nhất nếu chưa có title từ người dùng
          if (!title) {
            const lines = extractedText.split('\n').slice(0, 50) // Chỉ xem 50 dòng đầu
            const foundTitle = findBestTitle(lines)
            if (foundTitle) {
              extractedTitle = foundTitle
            }
          }
        } catch (docxError: any) {
          console.error('DOCX parse error:', docxError)
          return NextResponse.json(
            { 
              success: false, 
              error: 'Không thể đọc file DOCX: ' + docxError.message + '. Vui lòng thử chuyển file sang TXT.'
            },
            { status: 400 }
          )
        }
      } else if (fileName.endsWith('.doc')) {
        // DOC file cũ - không thể parse trực tiếp
        return NextResponse.json(
          { 
            success: false, 
            error: 'File .DOC (Word 2003) không thể parse trực tiếp. Vui lòng chuyển sang .DOCX hoặc .TXT, hoặc sử dụng tab "Upload" với N8N webhook.'
          },
          { status: 400 }
        )
      } else if (fileName.endsWith('.pdf')) {
        // PDF file - sử dụng pdf-parse
        try {
          const pdfResult = await parsePdf(buffer)
          
          // pdf-parse trả về object có property text
          if (pdfResult && typeof pdfResult === 'object' && 'text' in pdfResult) {
            extractedText = (pdfResult as any).text
          } else if (typeof pdfResult === 'string') {
            extractedText = pdfResult
          } else {
            extractedText = String(pdfResult)
          }
          
          // Normalize text
          if (extractedText) {
            extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
          }
          
          // Tìm title tốt nhất nếu chưa có title từ người dùng
          if (!title) {
            const lines = extractedText.split('\n').slice(0, 50) // Chỉ xem 50 dòng đầu
            const foundTitle = findBestTitle(lines)
            if (foundTitle) {
              extractedTitle = foundTitle
            }
          }
        } catch (pdfError: any) {
          console.error('PDF parse error:', pdfError)
          return NextResponse.json(
            { 
              success: false, 
              error: 'Không thể đọc file PDF: ' + pdfError.message + '. Vui lòng thử chuyển file sang TXT.'
            },
            { status: 400 }
          )
        }
      }

      // Validate text đã extract
      if (!extractedText) {
        return NextResponse.json(
          { success: false, error: 'Không thể đọc nội dung từ file. File có thể bị lỗi hoặc không đúng định dạng.' },
          { status: 400 }
        )
      }
      
      // Normalize và clean text
      extractedText = extractedText.trim()
      
      if (extractedText.length < 10) {
        return NextResponse.json(
          { success: false, error: 'Nội dung file quá ngắn (dưới 10 ký tự). Vui lòng kiểm tra lại file.' },
          { status: 400 }
        )
      }
      
      // Log để debug (chỉ trong development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Extracted text length:', extractedText.length)
        console.log('Extracted title:', extractedTitle)
      }

      // Hàm extract các trường từ text
      function extractLawFields(text: string): any {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        const upperText = text.toUpperCase()
        
        // Extract số hiệu văn bản (ví dụ: 25/2017/QĐ-UBND, 997/QĐ-UBND, 1791/TB-TCHQ)
        const soHieuPatterns = [
          /Số:\s*(\d{1,5}\/[A-Z]{2,10}-[A-Z0-9]{2,10})/i,
          /Số\s+(\d{1,5}\/[A-Z]{2,10}-[A-Z0-9]{2,10})/i,
          /\d{1,5}\/\d{4}\/(QĐ|NĐ|TT|NQ|KH|CT|PL|L|TB|CV)-[A-Z0-9\s]+/gi,
          /\d{1,5}\/(QĐ|NĐ|TT|NQ|KH|CT|PL|L|TB|CV)-[A-Z0-9\s]+/gi,
          /\d{1,5}\/[A-Z]{2,10}-[A-Z0-9]{2,10}/gi
        ]
        let soHieu = `UPLOAD-${Date.now()}`
        for (const pattern of soHieuPatterns) {
          const match = text.match(pattern)
          if (match) {
            // Lấy group capture nếu có, nếu không lấy toàn bộ match
            const extracted = match[1] || match[0]
            if (extracted) {
              soHieu = extracted.replace(/SỐ:\s*/i, '').replace(/SỐ\s+/i, '').trim()
              // Giới hạn độ dài
              if (soHieu.length > 50) soHieu = soHieu.substring(0, 50)
              break
            }
          }
        }

        // Extract loại văn bản từ title
        let loaiVanBan = 'Văn bản upload'
        const loaiPatterns = [
          /QUYẾT ĐỊNH/i,
          /NGHỊ ĐỊNH/i,
          /THÔNG TƯ/i,
          /NGHỊ QUYẾT/i,
          /LUẬT/i,
          /KẾ HOẠCH/i,
          /CHỈ THỊ/i,
          /PHÁP LỆNH/i,
          /LỆNH/i,
          /THÔNG BÁO/i,
          /CÔNG VĂN/i
        ]
        for (const pattern of loaiPatterns) {
          if (extractedTitle.match(pattern)) {
            const match = extractedTitle.match(pattern)
            if (match) {
              loaiVanBan = match[0]
              break
            }
          }
        }

        // Extract ngày ban hành
        let ngayBanHanh: string | null = null
        const ngayBanHanhPatterns = [
          /(?:Hà\s+Nội|nơi\s+ban\s+hành)[,\s]+ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i,
          /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i,
          /(?:ngày|Hà\s+Nội)[,\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/i
        ]
        for (const pattern of ngayBanHanhPatterns) {
          const match = text.match(pattern)
          if (match) {
            // Pattern 1: ngày X tháng Y năm Z
            if (match[3] && match[2] && match[1] && match.length === 4) {
              ngayBanHanh = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
              break
            }
            // Pattern 2: X/Y/Z hoặc ngày X/Y/Z
            else if (match[3] && match[2] && match[1] && match.length >= 4) {
              const year = match[3]
              const month = match[2]
              const day = match[1]
              // Validate năm hợp lý (1900-2100)
              if (parseInt(year) >= 1900 && parseInt(year) <= 2100) {
                ngayBanHanh = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                break
              }
            }
          }
        }

        // Extract ngày công báo
        let ngayCongBao: string | null = null
        const ngayCongBaoPattern = /(?:ngày\s+công\s+báo|công\s+báo\s+ngày)[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i
        const congBaoMatch = text.match(ngayCongBaoPattern)
        if (congBaoMatch && congBaoMatch[3] && congBaoMatch[2] && congBaoMatch[1]) {
          ngayCongBao = `${congBaoMatch[3]}-${congBaoMatch[2].padStart(2, '0')}-${congBaoMatch[1].padStart(2, '0')}`
        }

        // Extract ngày hiệu lực
        let ngayHieuLuc: string | null = null
        const ngayHieuLucPatterns = [
          /(?:có\s+hiệu\s+lực\s+từ\s+ngày|hiệu\s+lực\s+từ\s+ngày)[:\s]+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i,
          /(?:có\s+hiệu\s+lực\s+từ\s+ngày|hiệu\s+lực)[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
          /(?:hiệu\s+lực\s+từ)\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i,
          /(?:có\s+hiệu\s+lực\s+kể\s+từ\s+ngày)[:\s]+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
        ]
        
        // Kiểm tra nếu là "kể từ ngày ban hành"
        if (text.match(/(?:có\s+hiệu\s+lực|có\s+hiệu\s+lực\s+kể\s+từ)\s+ngày\s+ban\s+hành/i)) {
          // Nếu có ngày ban hành, dùng ngày ban hành làm ngày hiệu lực
          // Sẽ được set sau
        } else {
          // Tìm ngày hiệu lực cụ thể
          for (const pattern of ngayHieuLucPatterns) {
            const match = text.match(pattern)
            if (match) {
              if (match[3] && match[2] && match[1]) {
                ngayHieuLuc = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
                break
              }
            }
          }
        }

        // Extract người ký (tìm ở cuối văn bản)
        let nguoiKy: string | null = null
        // Lấy 20 dòng cuối để tìm người ký
        const lastLines = lines.slice(-20).join('\n')
        const nguoiKyPatterns = [
          /(?:KT\.|KT\s+)?(?:TỔNG\s+CỤC\s+TRƯỞNG|THỐNG\s+ĐỐC|BỘ\s+TRƯỞNG|CHỦ\s+TỊCH|GIÁM\s+ĐỐC|TRƯỞNG\s+BAN|PHÓ\s+TỔNG\s+CỤC\s+TRƯỞNG)[\s\S]{0,300}([A-ZÀ-Ỹ\s]{8,50})\s*$/m,
          /([A-ZÀ-Ỹ][a-zà-ỹ]+\s+[A-ZÀ-Ỹ][a-zà-ỹ]+\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)\s*$/m,
          /([A-ZÀ-Ỹ\s]{10,50})(?:\s*\n\s*){0,3}$/m
        ]
        for (const pattern of nguoiKyPatterns) {
          const match = lastLines.match(pattern)
          if (match && match[1]) {
            let candidate = match[1].trim()
            // Loại bỏ các từ chức danh và ký tự đặc biệt
            candidate = candidate.replace(/(?:KT\.|TỔNG\s+CỤC\s+TRƯỞNG|THỐNG\s+ĐỐC|BỘ\s+TRƯỞNG|CHỦ\s+TỊCH|GIÁM\s+ĐỐC|PHÓ\s+TỔNG\s+CỤC\s+TRƯỞNG)\s*/gi, '').trim()
            // Kiểm tra nếu là tên người (có chữ hoa và chữ thường, không phải toàn chữ hoa quá dài)
            if (candidate.length >= 5 && candidate.length <= 50 && /[a-zà-ỹ]/.test(candidate)) {
              nguoiKy = candidate
              break
            }
            // Nếu toàn chữ hoa nhưng độ dài hợp lý (6-30 ký tự) và có khoảng trắng
            else if (candidate.length >= 6 && candidate.length <= 30 && /\s/.test(candidate) && candidate === candidate.toUpperCase()) {
              // Convert sang title case
              nguoiKy = candidate.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
              break
            }
          }
        }

        // Extract nơi ban hành
        let noiBanHanh: string | null = null
        const noiBanHanhPatterns = [
          // Pattern 1: TỔNG CỤC HẢI QUAN, BỘ TÀI CHÍNH, etc.
          /(?:BỘ\s+[A-ZÀ-Ỹ\s]{5,40}|TỔNG\s+CỤC\s+[A-ZÀ-Ỹ\s]{5,40}|UBND\s+(?:TỈNH|THÀNH\s+PHỐ|HUYỆN|XÃ)\s+[A-ZÀ-Ỹ\s]{5,40})/i,
          // Pattern 2: Tìm trước "Số:" hoặc loại văn bản
          /^(?:CỘNG\s+HÒA[\s\S]{0,150})?(?:BỘ\s+[A-ZÀ-Ỹ\s]+[\s\S]{0,20})?([A-ZÀ-Ỹ\s]{8,60})(?:[\s\S]{0,30}?)(?:Số\s*:|QUYẾT\s+ĐỊNH|NGHỊ\s+ĐỊNH|THÔNG\s+TƯ|THÔNG\s+BÁO)/i,
          // Pattern 3: Sau "BỘ" hoặc "TỔNG CỤC" và trước ", ngày" hoặc "Số"
          /([A-ZÀ-Ỹ\s]{10,60})(?:,\s+ngày|\s+Số\s*:)/i
        ]
        for (const pattern of noiBanHanhPatterns) {
          const match = text.match(pattern)
          if (match) {
            // Lấy group capture nếu có, nếu không lấy toàn bộ match
            const candidate = (match[1] || match[0]).trim()
            // Loại bỏ các cụm từ không phải tên cơ quan
            if (candidate.length >= 8 && 
                !candidate.includes('ĐỘC LẬP') && 
                !candidate.includes('TỰ DO') &&
                !candidate.includes('HẠNH PHÚC') &&
                !candidate.match(/^CỘNG\s+HÒA/) &&
                !candidate.match(/^XÃ\s+HỘI/)) {
              // Kiểm tra nếu có từ khóa cơ quan
              if (candidate.match(/^(?:BỘ|TỔNG\s+CỤC|UBND|CỤC|CHI\s+CỤC)/i) || candidate.length >= 10) {
                noiBanHanh = candidate
                // Giới hạn độ dài
                if (noiBanHanh.length > 100) noiBanHanh = noiBanHanh.substring(0, 100)
                break
              }
            }
          }
        }

        // Extract số công báo
        let soCongBao: string | null = null
        const soCongBaoPattern = /(?:số\s+công\s+báo|công\s+báo\s+số)[:\s]+([\d\/\-]+)/i
        const soCongBaoMatch = text.match(soCongBaoPattern)
        if (soCongBaoMatch && soCongBaoMatch[1]) {
          soCongBao = soCongBaoMatch[1].trim()
        }

        // Extract tình trạng
        let tinhTrang = 'Còn hiệu lực'
        if (text.match(/(?:hết|đã\s+hết|không\s+còn)\s+hiệu\s+lực/i)) {
          tinhTrang = 'Hết hiệu lực'
        } else if (text.match(/(?:sửa\s+đổi|được\s+sửa|đã\s+sửa)/i)) {
          tinhTrang = 'Đã sửa đổi'
        } else if (text.match(/(?:có\s+hiệu\s+lực|còn\s+hiệu\s+lực|đang\s+hiệu\s+lực)/i)) {
          tinhTrang = 'Còn hiệu lực'
        }
        
        // Nếu có "kể từ ngày ban hành" thì mặc định còn hiệu lực
        if (text.match(/(?:có\s+hiệu\s+lực\s+kể\s+từ|hiệu\s+lực\s+kể\s+từ)\s+ngày/i)) {
          tinhTrang = 'Còn hiệu lực'
          // Nếu chưa có ngày hiệu lực và có ngày ban hành, dùng ngày ban hành
          if (!ngayHieuLuc && ngayBanHanh) {
            ngayHieuLuc = ngayBanHanh
          }
        }

        // Extract văn bản được dẫn chiếu
        let vanBanDuocDan: string | null = null
        const vanBanDanPattern = /(?:văn\s+bản|căn\s+cứ)[:\s]+([A-Z\d\s\/\-\.,]{20,200})/i
        const vanBanDanMatch = text.match(vanBanDanPattern)
        if (vanBanDanMatch && vanBanDanMatch[1]) {
          vanBanDuocDan = vanBanDanMatch[1].trim().substring(0, 200)
        }

        // Category từ loại văn bản (có thể extract từ nội dung nếu có keyword về lĩnh vực)
        let category: string | null = loaiVanBan !== 'Văn bản upload' ? loaiVanBan : null
        
        // Extract category từ keywords trong nội dung
        const categoryKeywords: { [key: string]: string[] } = {
          'Xuat-nhap-khau': ['xuất khẩu', 'nhập khẩu', 'hải quan', 'hàng hóa xuất', 'hàng hóa nhập'],
          'Xay-dung': ['xây dựng', 'công trình', 'kiến trúc'],
          'Tai-chinh': ['tài chính', 'ngân sách', 'thuế'],
          'Lao-dong': ['lao động', 'tiền lương', 'bảo hiểm'],
          'Giao-thong': ['giao thông', 'vận tải', 'đường bộ']
        }
        
        const lowerText = text.toLowerCase()
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(kw => lowerText.includes(kw))) {
            category = cat
            break
          }
        }

        // Tóm tắt (lấy 200-300 ký tự đầu, ưu tiên đoạn đầu tiên có nghĩa)
        let tomTat = ''
        const firstParagraph = lines.find(l => l.length > 50) || lines[0] || ''
        if (firstParagraph) {
          tomTat = firstParagraph.substring(0, 250) + (firstParagraph.length > 250 ? '...' : '')
        } else {
          tomTat = text.substring(0, 200) + (text.length > 200 ? '...' : '')
        }

        return {
          so_hieu: soHieu,
          loai_van_ban: loaiVanBan,
          ngay_ban_hanh: ngayBanHanh || new Date().toISOString().split('T')[0],
          ngay_cong_bao: ngayCongBao,
          ngay_hieu_luc: ngayHieuLuc,
          nguoi_ky: nguoiKy,
          noi_ban_hanh: noiBanHanh,
          so_cong_bao: soCongBao,
          tinh_trang: tinhTrang,
          category: category,
          tom_tat: tomTat,
          van_ban_duoc_dan: vanBanDuocDan
        }
      }

      // Extract tất cả các trường
      const extractedFields = extractLawFields(extractedText)

      // Tạo law object từ text đã extract với đầy đủ trường
      const lawData = {
        _id: `upload-${Date.now()}`,
        title: extractedTitle,
        so_hieu: extractedFields.so_hieu,
        loai_van_ban: extractedFields.loai_van_ban,
        noi_ban_hanh: extractedFields.noi_ban_hanh,
        ngay_ban_hanh: extractedFields.ngay_ban_hanh,
        ngay_cong_bao: extractedFields.ngay_cong_bao,
        ngay_hieu_luc: extractedFields.ngay_hieu_luc,
        nguoi_ky: extractedFields.nguoi_ky,
        noi_dung: extractedText,
        noi_dung_html: extractedText.replace(/\n/g, '<br>'),
        so_cong_bao: extractedFields.so_cong_bao,
        thuoc_tinh_html: null,
        tinh_trang: extractedFields.tinh_trang,
        tom_tat: extractedFields.tom_tat,
        tom_tat_html: extractedFields.tom_tat.replace(/\n/g, '<br>'),
        category: extractedFields.category,
        danh_sach_bang: null,
        link: null,
        van_ban_duoc_dan: extractedFields.van_ban_duoc_dan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Insert vào database
      const { data, error } = await supabaseAdmin
        .from('laws')
        .insert(lawData)
        .select()
        .single()

      if (error) {
        throw new Error('Lỗi khi lưu vào database: ' + error.message)
      }

      return NextResponse.json({
        success: true,
        message: 'Upload thành công',
        data: {
          id: data.id,
          title: data.title,
          text_length: extractedText.length
        }
      })

    } catch (parseError: any) {
      return NextResponse.json(
        { success: false, error: 'Lỗi khi xử lý file: ' + parseError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Upload word file error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi không xác định' },
      { status: 500 }
    )
  }
}

