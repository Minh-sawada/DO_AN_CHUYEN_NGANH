'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Send, FileText, Brain, User, Bot, Copy, Check, Loader2, MessageSquare, BookOpen, Clock, ExternalLink } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    id: number
    title: string
    article_reference: string
    source: string
  }>
  timestamp: Date
  isTyping?: boolean
}

interface ChatStats {
  totalMessages: number
  totalSources: number
  lastActivity: Date | null
}

interface LawDetail {
  id: number
  title: string
  content: string
  article_reference?: string
  source?: string
  created_at: string
}

export function ChatInterface() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showSources, setShowSources] = useState<boolean>(true)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<LawDetail | null>(null)
  const [isLoadingSource, setIsLoadingSource] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Chat statistics
  const chatStats: ChatStats = {
    totalMessages: messages.length,
    totalSources: messages.reduce((acc, msg) => acc + (msg.sources?.length || 0), 0),
    lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : null
  }

  useEffect(() => {
    // Scroll to bottom when new messages are added
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      }
    }
    
    // Use setTimeout to ensure DOM is updated
    setTimeout(scrollToBottom, 100)
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Copy message to clipboard
  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }


  // Clear chat
  const clearChat = () => {
    setMessages([])
    setExpandedSources(new Set())
    setCurrentSessionId(null) // Reset session để tạo session mới
  }

  // Toggle expanded sources for a message
  const toggleExpandedSources = (messageId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  const loadSourceDetail = async (sourceId: number) => {
    setIsLoadingSource(true)
    try {
      const response = await fetch(`/api/laws/${sourceId}`)
      const data = await response.json()
      
      if (data.success) {
        setSelectedSource(data.law)
      } else {
        console.error('Error loading source:', data.error)
      }
    } catch (error) {
      console.error('Error loading source detail:', error)
    } finally {
      setIsLoadingSource(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: 'Đang tìm kiếm thông tin...',
      timestamp: new Date(),
      isTyping: true
    }

    setMessages(prev => [...prev, userMessage, typingMessage])
    setInput('')
    setIsLoading(true)

    // Tạo session mới nếu chưa có
    let sessionId = currentSessionId
    if (!sessionId) {
      // Tạo UUID v4 cho session mới
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      }
      sessionId = generateUUID()
      setCurrentSessionId(sessionId)
    }

    // Lưu tin nhắn user vào database
    if (sessionId) {
      try {
        await fetch('/api/chat/save-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            role: 'user',
            content: userMessage.content,
            userId: user?.id
          })
        })
      } catch (error) {
        console.error('Error saving user message:', error)
      }
    }

    try {
      // Gửi đến n8n webhook
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK || 'https://trangiabao123.app.n8n.cloud/webhook/chat-new'
      console.log('Sending request to:', webhookUrl)
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          messages: messages,
          userId: user?.id
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Kiểm tra content-type trước khi parse JSON
      const contentType = response.headers.get('content-type')
      console.log('Content-Type:', contentType)
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.log('Non-JSON response:', text)
        throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 200)}`)
      }

      let data
      try {
        const responseText = await response.text()
        console.log('Raw response text:', responseText)
        console.log('Response length:', responseText.length)
        
        if (!responseText.trim()) {
          console.log('Empty response detected, providing fallback response')
          // Tạo response fallback khi n8n không trả về gì
          data = {
            response: "Xin lỗi, hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau hoặc liên hệ quản trị viên để được hỗ trợ.",
            sources: [],
            matched_ids: []
          }
        } else {
          data = JSON.parse(responseText)
          console.log('Response data:', data)
          console.log('Response response field:', data.response)
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        // Tạo response fallback khi parse JSON lỗi
        data = {
          response: "Xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ server. Vui lòng thử lại sau.",
          sources: [],
          matched_ids: []
        }
      }
      
      // Xử lý response từ n8n - CHỈ TRẢ LỜI THEO N8N
      let responseContent = 'Không có phản hồi từ server.'
      
      if (data.response && data.response.trim()) {
        responseContent = data.response
      } else if (data.error) {
        responseContent = `Lỗi: ${data.error}`
      } else if (data.sources && data.sources.length > 0) {
        // Tạm thời hiển thị thông tin về sources khi không có response
        responseContent = `Tôi tìm thấy ${data.sources.length} văn bản pháp luật liên quan. Bạn có thể tham khảo các nguồn bên dưới.`
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        sources: data.sources || [],
        timestamp: new Date()
      }

      // Remove typing indicator and add assistant message
      setMessages(prev => prev.filter(msg => msg.id !== 'typing').concat(assistantMessage))

      // Lưu tin nhắn bot vào database
      if (sessionId) {
        try {
          await fetch('/api/chat/save-simple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              role: 'assistant',
              content: assistantMessage.content,
              sources: assistantMessage.sources,
              userId: user?.id
            })
          })
        } catch (error) {
          console.error('Error saving assistant message:', error)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Lỗi kết nối: ${error instanceof Error ? error.message : 'Không xác định'}. Vui lòng kiểm tra n8n workflow.`,
        timestamp: new Date()
      }
      
      // Remove typing indicator and add error message
      setMessages(prev => prev.filter(msg => msg.id !== 'typing').concat(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Message component
  const MessageItem = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user'
    const isTyping = message.isTyping

    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUser && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div className={`rounded-2xl px-4 py-3 break-words ${
            isUser 
              ? 'bg-blue-600 text-white ml-auto' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            {isTyping ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{message.content}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {!isUser && message.sources && message.sources.length > 0 && showSources && (
                  <div className="mt-3 space-y-2">
                    <Separator className="bg-gray-300" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600">
                        Nguồn tham khảo ({message.sources.length}):
                      </p>
                      {(() => {
                        const isExpanded = expandedSources.has(message.id)
                        const maxVisible = 3
                        const visibleSources = isExpanded 
                          ? message.sources 
                          : message.sources.slice(0, maxVisible)
                        const hasMore = message.sources.length > maxVisible

                        return (
                          <>
                            {visibleSources.map((source, index) => (
                              <div key={index} className="bg-white/50 rounded-lg p-2 text-xs">
                                <div 
                                  className="flex items-start gap-2 cursor-pointer hover:bg-white/70 transition-colors"
                                  onClick={() => loadSourceDetail(source.id)}
                                >
                                  <BookOpen className="h-3 w-3 mt-0.5 text-blue-500 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-800 truncate">{source.title}</p>
                                    {source.article_reference && (
                                      <p className="text-blue-600 mt-1">{source.article_reference}</p>
                                    )}
                                    <p className="text-gray-500 mt-1">
                                      {source.source && source.source.startsWith('http') ? (
                                        <a 
                                          href={source.source} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {source.source}
                                        </a>
                                      ) : (
                                        source.source
                                      )}
                                    </p>
                                  </div>
                                  <ExternalLink className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
                                </div>
                              </div>
                            ))}
                            
                            {hasMore && (
                              <div className="flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpandedSources(message.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-6 px-2"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Thu gọn</span>
                                      <span className="ml-1">↑</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Xem thêm {message.sources.length - maxVisible} nguồn</span>
                                      <span className="ml-1">↓</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(message.timestamp)}
            </span>
            
            {!isUser && !isTyping && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(message.content, message.id)}
              >
                {copiedMessageId === message.id ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {isUser && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-green-100 text-green-600">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[700px] bg-white/50 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                AI Legal Assistant
              </CardTitle>
              <p className="text-sm text-gray-500">
                Hỗ trợ tư vấn pháp luật thông minh
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSources(!showSources)}
              className="text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              {showSources ? 'Ẩn nguồn' : 'Hiện nguồn'}
            </Button>
            
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-xs"
              >
                Xóa chat
              </Button>
            )}
          </div>
        </div>
        
        {/* Stats */}
        {chatStats.totalMessages > 0 && (
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {chatStats.totalMessages} tin nhắn
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              {chatStats.totalSources} nguồn
            </Badge>
            {chatStats.lastActivity && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(chatStats.lastActivity)}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full px-6">
          <div className="space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                    <Brain className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Chào mừng đến với Legal Chatbot! 👋
                </h3>
                <p className="text-gray-600 mb-6">
                  Tôi là AI Legal Assistant, sẵn sàng hỗ trợ bạn với các câu hỏi về pháp luật Việt Nam.
                </p>
                
                {/* Suggested Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <div 
                    className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors text-left"
                    onClick={() => setInput("Luật dân sự quy định gì về hợp đồng?")}
                  >
                    <p className="text-sm font-medium text-blue-800">Luật dân sự về hợp đồng</p>
                  </div>
                  <div 
                    className="p-3 bg-green-50 hover:bg-green-100 rounded-lg cursor-pointer transition-colors text-left"
                    onClick={() => setInput("Quyền và nghĩa vụ của người lao động là gì?")}
                  >
                    <p className="text-sm font-medium text-green-800">Luật lao động</p>
                  </div>
                  <div 
                    className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer transition-colors text-left"
                    onClick={() => setInput("Thủ tục thành lập doanh nghiệp như thế nào?")}
                  >
                    <p className="text-sm font-medium text-purple-800">Thành lập doanh nghiệp</p>
                  </div>
                  <div 
                    className="p-3 bg-orange-50 hover:bg-orange-100 rounded-lg cursor-pointer transition-colors text-left"
                    onClick={() => setInput("Tranh chấp đất đai được giải quyết ra sao?")}
                  >
                    <p className="text-sm font-medium text-orange-800">Tranh chấp đất đai</p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageItem key={message.id} message={message} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input Area */}
      <div className="p-6 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi về pháp luật..."
              className="min-h-[44px] max-h-32 resize-none pr-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <div className="absolute right-2 bottom-2 text-xs text-gray-400">
              {input.length}/1000
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Nhấn Enter để gửi, Shift+Enter để xuống dòng</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("")}
              className="text-xs h-6 px-2"
            >
              Xóa
            </Button>
          </div>
        </div>
      </div>

      {/* Source Detail Modal */}
      <Dialog open={!!selectedSource} onOpenChange={() => setSelectedSource(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Chi tiết văn bản pháp luật
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingSource ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2">Đang tải...</span>
            </div>
          ) : selectedSource ? (
            <div className="space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Header */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {selectedSource.title}
                </h3>
                {selectedSource.article_reference && (
                  <p className="text-blue-700 font-medium">
                    {selectedSource.article_reference}
                  </p>
                )}
                {selectedSource.source && (
                  <p className="text-gray-600 text-sm mt-1">
                    Nguồn: {selectedSource.source.startsWith('http') ? (
                      <a 
                        href={selectedSource.source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {selectedSource.source}
                      </a>
                    ) : (
                      selectedSource.source
                    )}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Cập nhật: {new Date(selectedSource.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>

              {/* Content */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Nội dung:</h4>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {selectedSource.content}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
