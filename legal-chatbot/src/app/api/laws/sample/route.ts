import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Đọc file từ root hoặc public folder
    const filePath = path.join(process.cwd(), 'public', 'sample-laws.json')
    
    // Nếu không có trong public, thử root
    let fileContent: string
    if (fs.existsSync(filePath)) {
      fileContent = fs.readFileSync(filePath, 'utf-8')
    } else {
      // Thử đọc từ root
      const rootPath = path.join(process.cwd(), 'sample-laws.json')
      fileContent = fs.readFileSync(rootPath, 'utf-8')
    }

    // Validate JSON trước khi trả về
    try {
      JSON.parse(fileContent)
    } catch (parseError) {
      return NextResponse.json(
        { error: 'File mẫu bị lỗi. Vui lòng liên hệ admin.' },
        { status: 500 }
      )
    }

    // Trả về file với header đúng
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="sample-laws.json"',
      },
    })
  } catch (error: any) {
    console.error('Error serving sample file:', error)
    return NextResponse.json(
      { error: 'Không thể tải file mẫu: ' + error.message },
      { status: 500 }
    )
  }
}

