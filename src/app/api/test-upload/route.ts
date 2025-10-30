import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    console.log('Test upload - File:', file?.name, 'Title:', title)

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Test database connection
    const { data: testData, error: testError } = await supabaseAdmin
      .from('laws')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('Database test error:', testError)
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: testError.message 
      }, { status: 500 })
    }

    // Convert file to text
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let text = ''

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Only .txt files supported in test' }, { status: 400 })
    }

    console.log('Extracted text length:', text.length)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      textLength: text.length,
      title: title,
      preview: text.substring(0, 200) + '...',
      databaseConnected: true
    })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json({ 
      error: 'Upload test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
