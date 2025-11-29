import { NextRequest, NextResponse } from 'next/server'

// Supported file types
const SUPPORTED_TYPES = {
  'image/jpeg': { maxSize: 10 * 1024 * 1024, label: 'JPEG Image' },
  'image/jpg': { maxSize: 10 * 1024 * 1024, label: 'JPG Image' },
  'image/png': { maxSize: 10 * 1024 * 1024, label: 'PNG Image' },
  'image/webp': { maxSize: 10 * 1024 * 1024, label: 'WebP Image' },
  'application/pdf': { maxSize: 20 * 1024 * 1024, label: 'PDF Document' },
  'text/plain': { maxSize: 5 * 1024 * 1024, label: 'Text File' }
}

// Simple OCR using client-side approach (placeholder)
// In production, you'd use services like Tesseract.js, Google Vision API, etc.
async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    // For now, return a placeholder indicating OCR would happen here
    // In a real implementation, you would:
    // 1. Use Tesseract.js for client-side OCR
    // 2. Or send to Google Vision API
    // 3. Or use other OCR service
    
    return `[Hình ảnh đã được tải lên - OCR sẽ được thực hiện để trích xuất văn bản. 
Để triển khai OCR đầy đủ, bạn có thể:
1. Dùng Tesseract.js cho client-side OCR
2. Sử dụng Google Vision API
3. Tích hợp dịch vụ OCR khác]

Kích thước ảnh: ${imageBuffer.length} bytes`
  } catch (error) {
    console.error('OCR Error:', error)
    return '[Lỗi khi trích xuất văn bản từ ảnh]'
  }
}

// Extract text from PDF
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const { default: pdfParse } = await import('pdf-parse')
    const pdfData = await pdfParse(pdfBuffer)
    return pdfData.text || '[Không thể trích xuất văn bản từ PDF]'
  } catch (error) {
    console.error('PDF extraction error:', error)
    return '[Lỗi khi đọc file PDF]'
  }
}

// Extract text from text file
function extractTextFromTXT(textBuffer: Buffer): string {
  try {
    return textBuffer.toString('utf-8')
  } catch (error) {
    console.error('Text file error:', error)
    return '[Lỗi khi đọc file text]'
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const fileTypeInfo = SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]
    if (!fileTypeInfo) {
      return NextResponse.json(
        { 
          error: `Unsupported file type: ${file.type}`,
          supportedTypes: Object.keys(SUPPORTED_TYPES)
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > fileTypeInfo.maxSize) {
      return NextResponse.json(
        { 
          error: `File size exceeds limit of ${fileTypeInfo.maxSize / (1024 * 1024)}MB`,
          maxSize: fileTypeInfo.maxSize
        },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text based on file type
    let extractedText = ''
    
    if (file.type.startsWith('image/')) {
      extractedText = await extractTextFromImage(buffer)
    } else if (file.type === 'application/pdf') {
      extractedText = await extractTextFromPDF(buffer)
    } else if (file.type === 'text/plain') {
      extractedText = extractTextFromTXT(buffer)
    } else {
      extractedText = `[File type ${file.type} detected - text extraction not implemented]`
    }

    // Return extracted text
    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      extractedText: extractedText,
      message: 'File processed successfully'
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error during file processing' },
      { status: 500 }
    )
  }
}
