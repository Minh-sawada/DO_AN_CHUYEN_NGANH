import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    console.log('Simple upload request:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      title: title
    })

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let text = ''

    // Extract text based on file type
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else {
      // For other file types, try to read as text
      text = buffer.toString('utf-8')
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'No text extracted from file' }, { status: 400 })
    }

    // Split text into chunks (simple split by sentences)
    const sentences = text.split(/(?<=[.?!])\s+/)
    const chunks: string[] = []
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

    let processedChunks = 0

    // Process each chunk (without embedding for now)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Create dummy embedding (all zeros)
      const dummyEmbedding = new Array(1536).fill(0)

      // Extract article reference from chunk if possible
      const articleReference = extractArticleReference(chunk)

      // Insert into database - dùng đúng schema
      const { error } = await supabaseAdmin
        .from('laws')
        .insert({
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          noi_dung: chunk, // Dùng noi_dung thay vì content
          noi_dung_html: null,
          category: 'Uploaded',
          loai_van_ban: 'Văn bản upload',
          so_hieu: articleReference || `UP-${Date.now()}-${i}`,
          embedding: dummyEmbedding
        })

      if (error) {
        console.error('Database error:', error)
        continue // Continue to next chunk even if one fails
      }
      processedChunks++
    }

    return NextResponse.json({ 
      message: 'Files processed and uploaded successfully (without embeddings)', 
      processedChunks 
    }, { status: 200 })

  } catch (error) {
    console.error('Simple Upload Error:', error)
    return NextResponse.json({ 
      error: (error as Error).message || 'Internal server error' 
    }, { status: 500 })
  }
}

function extractArticleReference(text: string): string | null {
  const regex = /(Điều\s+\d+(\s+\w+)?(\s+và\s+\d+)?(\s+đến\s+\d+)?(\s+của\s+Luật\s+[\w\s]+)?)|(Khoản\s+\d+(\s+\w+)?(\s+của\s+Điều\s+\d+)?)/g;
  const match = text.match(regex);
  return match ? match.join('; ') : null;
}
