import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Helper function để lấy user_id từ request (từ cookies)
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Thử lấy từ authorization header trước
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      })

      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) return user.id
    }

    // Nếu không có authorization header, lấy từ cookies
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      console.log('No user found in cookies:', error?.message)
      return null
    }

    return user.id
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    // Lấy user_id từ request
    userId = await getUserIdFromRequest(request)
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    console.log('Simple upload request:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      title: title,
      userId: userId
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
        } as any)

      if (error) {
        console.error('Database error:', error)
        continue // Continue to next chunk even if one fails
      }
      processedChunks++
    }

    // Log activity sau khi upload thành công
    if (userId) {
      try {
        const clientIP = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
        const clientUserAgent = request.headers.get('user-agent') || 'unknown'

        console.log('Logging upload activity:', {
          userId,
          fileName: file.name,
          chunksProcessed: processedChunks
        })

        const { data, error: logError } = await supabaseAdmin.rpc('log_user_activity', {
          p_user_id: userId,
          p_activity_type: 'upload',
          p_action: 'upload_document',
          p_details: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            title: title || file.name.replace(/\.[^/.]+$/, ''),
            chunksProcessed: processedChunks
          },
          p_ip_address: clientIP,
          p_user_agent: clientUserAgent,
          p_risk_level: 'low'
        } as any)

        if (logError) {
          console.error('Failed to log upload activity:', logError)
        } else {
          console.log('✅ Upload activity logged successfully:', data)
        }
      } catch (logError) {
        console.error('Failed to log upload activity:', logError)
        // Không throw - logging không nên làm gián đoạn flow chính
      }
    } else {
      console.log('⚠️ No user_id found, skipping logging')
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
