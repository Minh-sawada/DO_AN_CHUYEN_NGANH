import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth-utils'

interface Source {
  id: string | number;
  title: string;
  article_reference: string | null;
  source: string | null;
  link: string | null; // Link trực tiếp đến văn bản pháp luật
  so_hieu: string | null;
  loai_van_ban: string | null;
  category: string;
}

// Hàm kiểm tra xem query có phải là câu chào đơn giản không
function isSimpleGreeting(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  const greetingPatterns = [
    /^(hello|hi|hey|chào|chào bạn|chào anh|chào chị|chào em|xin chào|chào buổi sáng|chào buổi chiều|chào buổi tối)$/,
    /^(hế lô|hê lô|hê lô bạn|hế lô bạn)$/,
    /^(good morning|good afternoon|good evening)$/,
    /^(chào|hi|hello)\s*[!?.]*$/,
  ]
  
  return greetingPatterns.some(pattern => pattern.test(normalizedQuery))
}

// Hàm kiểm tra xem query có yêu cầu trích nguồn rõ ràng không
function hasExplicitSourceRequest(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  
  // Các từ khóa yêu cầu trích nguồn rõ ràng
  const sourceRequestPatterns = [
    /(trích|nguồn|tham khảo|dẫn chứng|chứng minh|theo luật|căn cứ|theo quy định|theo điều|theo khoản)/i,
    /(luật nào|quy định nào|điều nào|khoản nào|văn bản nào)/i,
    /(cho tôi biết|hãy cho|gửi|gửi cho|trích dẫn|liệt kê)/i
  ]
  
  return sourceRequestPatterns.some(pattern => pattern.test(normalizedQuery))
}

// Hàm kiểm tra xem query có liên quan đến pháp luật không
function isLegalRelatedQuery(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  
  // Các từ khóa liên quan đến pháp luật
  const legalKeywords = [
    'luật', 'pháp luật', 'pháp lý', 'quy định', 'nghị định', 'thông tư',
    'quyết định', 'văn bản pháp luật', 'điều luật', 'khoản', 'điều',
    'luật sư', 'tư vấn pháp luật', 'tranh chấp', 'hợp đồng', 'thỏa thuận',
    'quyền', 'nghĩa vụ', 'trách nhiệm', 'vi phạm', 'xử phạt', 'phạt',
    'tòa án', 'tòa', 'kiện', 'khởi kiện', 'bồi thường', 'thiệt hại',
    'pháp nhân', 'cá nhân', 'doanh nghiệp', 'công ty', 'thành lập',
    'giấy phép', 'đăng ký', 'thủ tục', 'hành chính', 'dân sự', 'hình sự',
    'lao động', 'thuế', 'bảo hiểm', 'sở hữu', 'tài sản', 'thừa kế',
    'hôn nhân', 'gia đình', 'ly hôn', 'con cái', 'nuôi dưỡng',
    // Logistics, vận chuyển, vận tải
    'logistics', 'vận chuyển', 'vận tải', 'giao hàng', 'vận chuyển hàng hóa',
    'vận tải hàng hóa', 'vận tải biển', 'vận tải đường bộ', 'vận tải đường sắt',
    'vận tải hàng không', 'kho bãi', 'lưu kho', 'bảo quản hàng hóa',
    // Buôn lậu, hàng lậu, gian lận thương mại
    'buôn lậu', 'hàng lậu', 'lậu', 'gian lận thương mại', 'hàng giả',
    'vận chuyển trái phép', 'nhập khẩu trái phép', 'xuất khẩu trái phép',
    // Hải quan, thuế quan
    'hải quan', 'thuế quan', 'thuế nhập khẩu', 'thuế xuất khẩu', 'kiểm tra hải quan',
    // Các từ khóa tiếng Anh
    'law', 'legal', 'regulation', 'decree', 'circular', 'decision',
    'contract', 'dispute', 'court', 'lawsuit', 'compensation',
    'logistics', 'transport', 'shipping', 'smuggling', 'customs'
  ]
  
  // Kiểm tra có chứa từ khóa pháp luật
  const hasLegalKeyword = legalKeywords.some(keyword => normalizedQuery.includes(keyword))
  
  // Kiểm tra có pattern số hiệu văn bản pháp luật (ví dụ: 25/2017/QĐ-UBND)
  const hasLawNumberPattern = /\d{1,4}\/\d{4}\/(QĐ|NĐ|TT|NQ|KH|CT|PL|L)-[A-Z]+/i.test(query)
  
  return hasLegalKeyword || hasLawNumberPattern
}

// Helper: remove Vietnamese diacritics for accent-insensitive matching
function removeDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

// Heuristic summarizer: synthesize concise bullet points
function summarizeText(text: string): string {
  const cleaned = (text || '').trim()
  if (!cleaned) return 'Không có nội dung trước đó để tóm tắt.'

  // Prefer existing bullet/numbered lists
  const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const bulletLines = lines.filter(l => /^[-*•\d+\.\)]\s*/.test(l))
  if (bulletLines.length >= 3) {
    return bulletLines.slice(0, 7).map(l => l.replace(/^[-*•\d+\.\)]\s*/, '• ')).join('\n')
  }

  // Sentence-based extraction
  const sentences = cleaned
    .replace(/\n+/g, ' ')
    .split(/(?<=[\.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  const keyPatterns = [
    /không có|không tồn tại|không ban hành|chưa ban hành/i,
    /là văn bản pháp luật cao nhất|văn bản pháp luật cao nhất|văn bản chính/i,
    /hiệu lực|ngày có hiệu lực|ban hành/i,
    /quy định về|bao gồm|gồm các/i,
    /tóm lại|kết luận|tổng kết/i
  ]

  const picked: string[] = []
  for (const s of sentences) {
    if (keyPatterns.some(p => p.test(s))) picked.push(s)
    if (picked.length >= 6) break
  }

  // Ensure we have at least some content
  const basis = picked.length > 0 ? picked : sentences.slice(0, 6)

  // Convert to concise bullets
  const bullets = basis.map(s => `• ${s}`)
  return bullets.join('\n')
}

// Hàm kiểm tra xem query có phải là câu hỏi tiếp theo dựa trên context không
function isFollowUpQuestion(query: string, previousMessages: any[]): boolean {
  const normalizedQuery = query.toLowerCase().trim()
  const noAccent = removeDiacritics(normalizedQuery)
  
  // Các từ khóa cho câu hỏi tiếp theo
  const followUpPatterns = [
    /^(tóm lại|tổng kết|kết luận|tóm tắt|tổng hợp|vậy|thì|vậy thì)/i,
    /(làm gì|phải làm|nên làm|cần làm|bước tiếp theo|tiếp theo)/i,
    /(giải thích|nói rõ|chi tiết|thêm|nữa)/i,
    /(còn gì|gì nữa|khác)/i,
    /^(ok|okay|được|hiểu|rồi)/i
  ]
  
  // Nếu có messages trước đó và query ngắn hoặc có pattern follow-up
  const hasFollowUpPattern = followUpPatterns.some(pattern => pattern.test(normalizedQuery))
    || /(tom lai|tong ket|ket luan|tom tat|tong hop|tiep theo)/i.test(noAccent)
  const isShortQuery = normalizedQuery.length < 50 && previousMessages.length > 0
  
  return hasFollowUpPattern || (isShortQuery && previousMessages.length > 0)
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body trước để có clientUserId
    const body = await request.json()
    const { query, messages: previousMessages = [], userId: clientUserId, uploadedFiles = [] } = body
    
    // Lấy userId từ cookies - dùng cách giống các route khác
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // Log request headers để debug
    const cookieHeader = request.headers.get('cookie')
    console.log('🔍 Chat-enhanced: Checking auth...', {
      cookiesCount: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      hasSupabaseCookies: allCookies.some(c => c.name.includes('supabase') || c.name.includes('sb-')),
      hasCookieHeader: !!cookieHeader,
      cookieHeaderLength: cookieHeader?.length || 0,
      hasClientUserId: !!clientUserId,
      uploadedFilesCount: uploadedFiles.length,
      uploadedFiles: uploadedFiles.map((f: any) => ({ name: f.name, size: f.size, hasExtractedText: !!f.extractedText }))
    })
    
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    )

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Thử lấy user từ cookies - dùng getUser() trước
    let user = null
    let userError = null
    
    const { data: { user: userFromGetUser }, error: getUserError } = await authSupabase.auth.getUser()
    user = userFromGetUser
    userError = getUserError
    
    // Nếu getUser() fail, thử getSession() như fallback
    if (userError || !user) {
      console.log('⚠️ getUser() failed, trying getSession()...', {
        error: userError?.message
      })
      const { data: { session }, error: sessionError } = await authSupabase.auth.getSession()
      if (session?.user && !sessionError) {
        user = session.user
        userError = null
        console.log('✅ Got user from getSession() fallback')
      }
    }
    
    let userId: string | null = null
    
    // Ưu tiên dùng user từ cookies
    if (user) {
      userId = user.id
      console.log('✅ Chat-enhanced: User authenticated from cookies:', userId)
    } 
    // Nếu không có user từ cookies nhưng có clientUserId, validate clientUserId
    else if (clientUserId) {
      console.log('⚠️ No user from cookies, validating clientUserId from body...', clientUserId)
      // Validate user có tồn tại không
      const { data: userData, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', clientUserId)
        .single()
      
      if (userCheckError || !userData) {
        console.error('❌ Invalid userId from client:', userCheckError?.message)
        return NextResponse.json({ 
          success: false, 
          error: 'Unauthorized',
          response: 'Vui lòng đăng nhập để sử dụng tính năng chat.'
        }, { status: 401 })
      }
      
      userId = clientUserId
      console.log('✅ Chat-enhanced: User validated from body:', userId)
    }
    
    // Nếu vẫn không có userId, báo lỗi
    if (!userId) {
      console.error('❌ Auth error in chat-enhanced: No userId available', {
        error: userError?.message || 'No user',
        errorCode: userError?.status,
        errorName: userError?.name,
        hasCookies: allCookies.length > 0,
        cookieNames: allCookies.map(c => c.name),
        cookiesCount: allCookies.length,
        hasClientUserId: !!clientUserId
      })
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        response: 'Vui lòng đăng nhập để sử dụng tính năng chat.'
      }, { status: 401 })
    }

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    // Kiểm tra xem có phải câu hỏi tiếp theo không
    const isFollowUp = isFollowUpQuestion(query, previousMessages)
    // Phát hiện yêu cầu tóm tắt (có dấu/không dấu)
    const wantsSummary = /(tóm tắt|tổng hợp)/i.test(query) || /(tom tat|tong hop)/i.test(removeDiacritics(query))
    
    // Nếu là câu hỏi tiếp theo, tạo context từ messages trước
    let conversationContext = ""
    if (previousMessages.length > 0) {
      // Lấy 8-10 tin nhắn gần nhất để làm context
      const recentMessages = previousMessages.slice(-10)
      conversationContext = recentMessages.map((msg: any) => {
        const role = msg.role === 'user' ? 'Người dùng' : 'Trợ lý AI'
        return `${role}: ${msg.content}`
      }).join('\n\n')
    }

    // Nếu là câu hỏi tiếp theo, xử lý đặc biệt
    if (isFollowUp && conversationContext) {
      // Tạo response dựa trên context của cuộc hội thoại trước
      const lastAssistantMessage = previousMessages.filter((m: any) => m.role === 'assistant').pop()
      
      if (lastAssistantMessage) {
        const lastContent = lastAssistantMessage.content
        
        // Nếu user yêu cầu "tóm tắt" nội dung trước đó
        if (wantsSummary) {
          // Nếu có webhook n8n và query pháp luật, ưu tiên xử lý ở nhánh n8n bên dưới
          const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK
          const shouldSearch = isLegalRelatedQuery(query)
          if (!(n8nWebhookUrl && shouldSearch)) {
            const summary = summarizeText(lastContent)
            return NextResponse.json({
              response: `Tóm tắt ngắn gọn nội dung trước đó:\n\n${summary}`,
              sources: [],
              matched_ids: [],
              total_sources: 0,
              search_method: 'follow-up'
            })
          }
          // Nếu có n8n và nên search, không return ở đây để xử lý tiếp ở nhánh n8n
        }

        // Nếu user hỏi "tóm lại tui cần làm gì" hoặc tương tự
        if (/(tóm lại.*làm gì|tổng kết.*làm|kết luận.*làm|cần làm gì|phải làm gì|nên làm gì)/i.test(query)) {
          // Trích xuất các bước hành động từ câu trả lời trước
          // Tìm các phần có "Các bước", "Bước", "Thực hiện", v.v.
          const stepsSection = lastContent.match(/(?:Các bước|Bước|Thực hiện|Nên thực hiện|Cần thực hiện)[\s\S]{0,2000}/i)
          
          if (stepsSection) {
            // Trích xuất các bước được đánh số
            const actionSteps = stepsSection[0].match(/\d+\.\s*[^\n]+(?:\n+[^\d\n]+)*/g) || []
            if (actionSteps.length > 0) {
              return NextResponse.json({
                response: `Dựa trên câu trả lời trước, đây là các bước bạn cần thực hiện:\n\n${actionSteps.join('\n\n')}\n\nBạn có câu hỏi gì về các bước này không?`,
                sources: [],
                matched_ids: [],
                total_sources: 0,
                search_method: 'follow-up'
              })
            }
          }
          
          // Nếu không tìm thấy bước cụ thể, tóm tắt lại phần quan trọng
          const importantParts = lastContent.match(/(?:Công ty|Bạn|Người|Cần|Phải|Nên)[^\.]+\./g) || []
          if (importantParts.length > 0) {
            const summary = importantParts.slice(0, 5).join('\n\n')
            return NextResponse.json({
              response: `Dựa trên câu trả lời trước, tóm tắt những điều bạn cần làm:\n\n${summary}\n\nBạn có muốn tôi giải thích thêm phần nào không?`,
              sources: [],
              matched_ids: [],
              total_sources: 0,
              search_method: 'follow-up'
            })
          }
        }
        
        // Nếu user hỏi "tóm lại" đơn giản
        if (/^(tóm lại|tổng kết|kết luận|vậy|thì|vậy thì)/i.test(query)) {
          // Tóm tắt lại câu trả lời trước (lấy phần đầu quan trọng)
          const summary = lastContent.split('\n\n').slice(0, 3).join('\n\n')
          return NextResponse.json({
            response: `Dựa trên câu trả lời trước, tóm tắt lại:\n\n${summary}\n\nBạn có muốn tôi giải thích thêm phần nào không?`,
            sources: [],
            matched_ids: [],
            total_sources: 0,
            search_method: 'follow-up'
          })
        }
        
        // Nếu user hỏi "làm gì", "phải làm", v.v.
        if (/(làm gì|phải làm|nên làm|cần làm|bước tiếp theo|tiếp theo)/i.test(query)) {
          // Trích xuất các bước hành động từ câu trả lời trước
          const actionSteps = lastContent.match(/\d+\.\s*[^\n]+(?:\n+[^\d\n]+)*/g) || []
          if (actionSteps.length > 0) {
            return NextResponse.json({
              response: `Dựa trên câu trả lời trước, các bước bạn cần thực hiện:\n\n${actionSteps.join('\n\n')}\n\nBạn có câu hỏi gì về các bước này không?`,
              sources: [],
              matched_ids: [],
              total_sources: 0,
              search_method: 'follow-up'
            })
          }
        }
      }
      
      // Nếu không match pattern đặc biệt, vẫn xử lý như bình thường nhưng có context
      // (sẽ được xử lý ở phần dưới)
    }

    // Nếu là câu chào đơn giản, trả về response đơn giản không có sources
    if (isSimpleGreeting(query)) {
      const greetingResponse = "Chào bạn! Tôi là trợ lý AI chuyên về pháp luật Việt Nam. Tôi có thể hỗ trợ bạn trả lời các câu hỏi về pháp luật, văn bản pháp luật, quy định pháp lý và các vấn đề liên quan. Bạn có câu hỏi gì về pháp luật không?"
      
      // Log activity (userId luôn có vì đã requireAuth)
      try {
        const clientIP = request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'unknown'
        const clientUserAgent = request.headers.get('user-agent') || 'unknown'

        await supabase.rpc('log_user_activity', {
          p_user_id: userId,
          p_activity_type: 'query',
          p_action: 'chat_query',
          p_details: {
            query: query.substring(0, 500),
            sourcesCount: 0,
            searchMethod: 'greeting',
            matchedIds: []
          },
          p_ip_address: clientIP,
          p_user_agent: clientUserAgent,
          p_risk_level: 'low'
        } as any)
      } catch (logError) {
        console.error('Failed to log chat activity:', logError)
      }

      return NextResponse.json({
        response: greetingResponse,
        sources: [], // Không có sources cho câu chào
        matched_ids: [],
        total_sources: 0,
        search_method: 'greeting'
      })
    }

    // 1. Nếu có n8n webhook, luôn gọi n8n trước (mọi câu hỏi)
    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK
    const shouldSearch = isLegalRelatedQuery(query)
    
    if (n8nWebhookUrl) {
      try {
        console.log('🔄 Calling n8n webhook:', n8nWebhookUrl)
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            userId: userId || null,
            // Truyền thêm lịch sử và bối cảnh để n8n suy luận theo hội thoại
            messages: previousMessages,
            context: conversationContext,
            topic: 'logistics',
            wantsSummary,
            uploadedFiles: uploadedFiles // Thêm file data để AI đọc nội dung
          }),
        })

        if (n8nResponse.ok) {
          const n8nData = await n8nResponse.json()
          console.log('✅ n8n webhook response received')
          
          // Chỉ trả về sources nếu thực sự có kết quả pháp luật và normalize format
          const validSources = (n8nData.sources || []).filter((source: any) => 
            source && (source.title || source.id)
          ).map((source: any) => ({
            id: source.id,
            title: source.title || 'Văn bản pháp luật',
            article_reference: source.article_reference || null,
            source: source.source || source.link || null,
            link: source.link || source.source || null, // Đảm bảo có link
            so_hieu: source.so_hieu || null,
            loai_van_ban: source.loai_van_ban || null,
            category: source.category || 'n8n'
          }))
          
          // Log activity (userId luôn có vì đã requireAuth)
          try {
            const clientIP = request.headers.get('x-forwarded-for') || 
                            request.headers.get('x-real-ip') || 
                            'unknown'
            const clientUserAgent = request.headers.get('user-agent') || 'unknown'

            await supabase.rpc('log_user_activity', {
              p_user_id: userId,
              p_activity_type: 'query',
              p_action: 'chat_query',
              p_details: {
                query: query.substring(0, 500),
                sourcesCount: validSources.length,
                searchMethod: 'n8n',
                matchedIds: n8nData.matched_ids || []
              },
              p_ip_address: clientIP,
              p_user_agent: clientUserAgent,
              p_risk_level: 'low'
            } as any)
          } catch (logError) {
            console.error('Failed to log chat activity:', logError)
          }

          // Lưu query log
          try {
            await supabase.from('query_logs').insert({
              query: query,
              response: n8nData.response || '',
              user_id: userId,
              sources_count: validSources.length
            })
          } catch (logError) {
            console.error('Error logging query:', logError)
          }

          // Kiểm tra xem user có yêu cầu trích nguồn rõ ràng không
          const explicitSourceRequest = hasExplicitSourceRequest(query)
          
          // Nếu là yêu cầu tóm tắt, tóm tắt n8n.response
          if (wantsSummary) {
            const summarized = summarizeText(n8nData.response || '')
            return NextResponse.json({
              response: `Tóm tắt ngắn gọn nội dung trước đó:\n\n${summarized}`,
              sources: [],
              matched_ids: n8nData.matched_ids || [],
              total_sources: 0,
              search_method: 'n8n-summary'
            })
          }

          // Trả về chỉ link khi người dùng yêu cầu nguồn
          const minimalSources = validSources.map((s: any) => ({ id: s.id, link: s.link || s.source || null }))

          return NextResponse.json({
            response: n8nData.response || 'Xin lỗi, không thể xử lý câu hỏi của bạn.',
            sources: explicitSourceRequest ? minimalSources : [],
            matched_ids: n8nData.matched_ids || [],
            total_sources: explicitSourceRequest ? minimalSources.length : 0,
            search_method: 'n8n'
          })
        } else {
          console.warn('⚠️ n8n webhook returned error, falling back to local search')
        }
      } catch (n8nError) {
        console.error('❌ Error calling n8n webhook:', n8nError)
        console.log('🔄 Falling back to local search')
      }
    }

    // 2. Chỉ tìm kiếm nếu query liên quan đến pháp luật (nếu chưa dùng n8n)
    let sources: Source[] = []
    let matched_ids: (string | number)[] = []
    let context = ""

    if (shouldSearch) {
      // Tìm kiếm trong database local với độ chính xác cao hơn
      // Tách query thành các từ khóa để tìm kiếm chính xác hơn
      const recentUserTexts = previousMessages
        .filter((m: any) => m.role === 'user')
        .slice(-10)
        .map((m: any) => m.content)
        .join(' ')
      const searchBase = (recentUserTexts ? (recentUserTexts + ' ') : '') + query
      const searchBaseLower = searchBase.toLowerCase()
      const queryWords = searchBaseLower.split(/\s+/).filter((word: string) => word.length > 2)
      
      // Tìm kiếm với độ ưu tiên: title trước, sau đó mới đến content
      let searchQuery = supabase
        .from('laws')
        .select('*')
      
      // Nếu có nhiều từ khóa, tìm kiếm chính xác hơn
      if (queryWords.length > 0) {
        // Tìm trong title trước (ưu tiên cao)
        const titleConditions = queryWords.map((word: string) => `title.ilike.%${word}%`).join(',')
        // Tìm trong content (ưu tiên thấp hơn)
        const contentConditions = queryWords.map((word: string) => `content.ilike.%${word}%`).join(',')
        
        searchQuery = searchQuery.or(`${titleConditions},${contentConditions}`)
      } else {
        // Nếu query ngắn, tìm kiếm đơn giản
        searchQuery = searchQuery.or(`title.ilike.%${searchBase}%,content.ilike.%${searchBase}%`)
      }
      
      const { data: localResults, error: localError } = await searchQuery.limit(10) // Lấy nhiều hơn để filter

    if (!localError && localResults && localResults.length > 0) {
      // Filter và rank kết quả theo độ liên quan
      const queryLower = searchBaseLower
      const rankedResults = localResults
        .map((law: any) => {
          const title = (law.title || '').toLowerCase()
          const content = (law.content || '').toLowerCase()
          const soHieu = (law.so_hieu || '').toLowerCase()
          
          // Tính điểm liên quan
          let relevanceScore = 0
          
          // Title match = điểm cao nhất
          if (title.includes(queryLower)) relevanceScore += 10
          queryWords.forEach((word: string) => {
            if (title.includes(word)) relevanceScore += 5
          })
          
          // Số hiệu match = điểm cao
          if (soHieu.includes(queryLower)) relevanceScore += 8
          
          // Content match = điểm thấp hơn
          if (content.includes(queryLower)) relevanceScore += 2
          queryWords.forEach((word: string) => {
            if (content.includes(word)) relevanceScore += 1
          })
          
          return { ...law, relevanceScore }
        })
        .filter((law: any) => law.relevanceScore >= 3) // Chỉ lấy kết quả có điểm >= 3 (đảm bảo liên quan)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore) // Sắp xếp theo điểm giảm dần
        .slice(0, 5) // Chỉ lấy 5 kết quả tốt nhất
      
      // Có kết quả từ database local sau khi filter
      sources = rankedResults.map((law: any) => {
        // Tạo link tự động từ số hiệu nếu không có link
        let link = law.link || law.source || null
        if (!link && law.so_hieu) {
          // Tạo link tìm kiếm trên thuvienphapluat.vn
          const searchQuery = encodeURIComponent(law.so_hieu)
          link = `https://thuvienphapluat.vn/van-ban/tim-kiem?keyword=${searchQuery}`
        }
        
        return {
        id: law.id,
          title: law.title || 'Văn bản pháp luật',
          article_reference: law.article_reference || null,
          source: law.source || law.link || link || null,
          link: link, // Link trực tiếp đến văn bản
          so_hieu: law.so_hieu || null,
          loai_van_ban: law.loai_van_ban || null,
        category: law.category || 'Local Database'
        }
      })
      
      // Chỉ lấy IDs từ kết quả đã được filter và rank
      matched_ids = rankedResults.map((law: any) => law.id)
      
      // Tạo context từ kết quả đã được filter (chỉ các văn bản thực sự liên quan)
      context = rankedResults.map((law: any) => 
        `Tiêu đề: ${law.title}\n` +
        `Điều/Khoản: ${law.article_reference || 'N/A'}\n` +
        `Nội dung: ${law.content || law.noi_dung || 'N/A'}\n` +
        `Nguồn: ${law.source || law.link || 'N/A'}\n`
      ).join('\n---\n')
    } else {
      // Không có kết quả từ database local, tìm kiếm từ các nguồn khác
      const externalResults = await searchExternalSources(query)
      
      if (externalResults.length > 0) {
        sources = externalResults.map((result: any) => ({
          id: result.id,
          title: result.title,
          article_reference: result.article_reference || null,
          source: result.source || result.link || null,
          link: result.link || result.source || null, // Link trực tiếp đến văn bản
          so_hieu: result.so_hieu || null,
          loai_van_ban: result.loai_van_ban || null,
          category: result.category || 'External Source'
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
    }

    // 3. Kiểm tra xem user có yêu cầu trích nguồn rõ ràng không
    const explicitSourceRequest = hasExplicitSourceRequest(query)

    // 4. Tạo response dựa trên context
    let response = ""
    
    if (sources.length > 0) {
      // Có kết quả tìm kiếm pháp luật
      if (explicitSourceRequest) {
        // User yêu cầu trích nguồn: chỉ trả về link tối giản
        const minimalSources = sources.map((s: any) => ({ id: s.id, link: s.link || s.source || null }))
        sources = minimalSources as any
        response = `Dưới đây là các liên kết tham khảo.`
      } else {
        // User không yêu cầu trích nguồn - chỉ trả lời, không hiển thị sources
        response = `Dựa trên các quy định pháp luật Việt Nam, tôi có thể trả lời câu hỏi của bạn:\n\n${query}\n\nLưu ý: Đây là thông tin tham khảo, bạn nên tham khảo thêm ý kiến của luật sư hoặc cơ quan có thẩm quyền để có lời khuyên chính xác nhất.`
        sources = []
      }
    } else if (shouldSearch && sources.length === 0) {
      // Đã tìm kiếm nhưng không có kết quả
      response = `Xin lỗi, tôi không tìm thấy thông tin pháp luật cụ thể liên quan đến câu hỏi "${query}" trong cơ sở dữ liệu hiện tại. Bạn có thể:\n\n1. Thử diễn đạt câu hỏi theo cách khác\n2. Liên hệ với luật sư để được tư vấn chuyên sâu\n3. Tham khảo các nguồn pháp luật chính thức như:\n   - Thư viện Pháp luật (thuvienphapluat.vn)\n   - Cổng thông tin điện tử Chính phủ (vanban.chinhphu.vn)`
      // Không có sources nên không hiển thị "Nguồn tham khảo"
      sources = []
    } else {
      // Không phải câu hỏi về pháp luật - trả lời chung chung
      response = `Tôi là trợ lý AI chuyên về pháp luật Việt Nam. Tôi có thể hỗ trợ bạn trả lời các câu hỏi về pháp luật, văn bản pháp luật, quy định pháp lý và các vấn đề liên quan.\n\nNếu bạn có câu hỏi về pháp luật, vui lòng đặt câu hỏi cụ thể. Ví dụ:\n- "Quy định về hợp đồng lao động"\n- "Luật về thừa kế"\n- "Quyền và nghĩa vụ của người lao động"`
      // Không có sources cho câu hỏi không liên quan pháp luật
      sources = []
    }

    // 5. Lưu query log
    try {
      await supabase.from('query_logs').insert({
        query: query,
        response: response,
        user_id: userId,
        sources_count: sources.length
      })
    } catch (logError) {
      console.error('Error logging query:', logError)
    }

    // 6. Log activity vào user_activities (userId luôn có vì đã requireAuth)
    try {
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      const clientUserAgent = request.headers.get('user-agent') || 'unknown'

      console.log('Logging chat activity:', {
        userId,
        query: query.substring(0, 100),
        sourcesCount: sources.length
      })

      const { data, error: logError } = await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_activity_type: 'query',
        p_action: 'chat_query',
        p_details: {
          query: query.substring(0, 500), // Giới hạn độ dài query
          sourcesCount: sources.length,
          searchMethod: shouldSearch ? (sources.length > 0 ? 'local' : 'external') : 'none',
          matchedIds: matched_ids
        },
        p_ip_address: clientIP,
        p_user_agent: clientUserAgent,
        p_risk_level: 'low'
      } as any)

      if (logError) {
        console.error('Failed to log chat activity:', logError)
      } else {
        console.log('✅ Chat activity logged successfully:', data)
      }
    } catch (logError) {
      console.error('Failed to log chat activity:', logError)
      // Không throw - logging không nên làm gián đoạn flow chính
    }

    return NextResponse.json({
      response: response,
      sources: sources, // Chỉ có sources khi thực sự tìm thấy kết quả pháp luật
      matched_ids: matched_ids,
      total_sources: sources.length,
      search_method: shouldSearch ? (sources.length > 0 ? 'local' : 'external') : 'none'
    })

  } catch (error: any) {
    console.error('Error in enhanced chat:', error)
    
    // Xử lý lỗi authentication
    if (error.message?.includes('Unauthorized') || error.message?.includes('login')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        response: 'Vui lòng đăng nhập để sử dụng tính năng chat.'
      }, { status: 401 })
    }
    
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
