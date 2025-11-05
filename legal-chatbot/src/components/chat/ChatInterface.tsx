'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, FileText, ExternalLink, Brain, Info, X, Paperclip, Search, BookOpen, Mic } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/AuthProvider'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    id: number
    title: string | null
    so_hieu: string | null
    loai_van_ban: string | null
    category: string | null
  }>
  timestamp: Date
}

export function ChatInterface() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLoginHint, setShowLoginHint] = useState(!user) // Hiển thị hint nếu chưa đăng nhập
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    // Ẩn hint khi user đăng nhập
    if (user) {
      setShowLoginHint(false)
    } else {
      setShowLoginHint(true)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Gửi đến n8n webhook thay vì API route
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK || 'http://localhost:5678/webhook/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          messages: messages
        }),
      })

      if (!response.ok) {
        throw new Error('Lỗi khi gửi tin nhắn')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.',
        variant: 'destructive',
      })
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
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

  return (
    <div className="flex flex-col h-full bg-white" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Messages Area - Full width, chat area chiếm toàn bộ */}
      <div 
        ref={scrollAreaRef}
        className="flex-1 bg-gray-50 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0, flex: '1 1 auto' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 pb-32 space-y-6">
          {/* Login Hint - chỉ hiển thị khi chưa đăng nhập */}
          {!user && showLoginHint && messages.length === 0 && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3 mb-4 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLoginHint(false)}
                  className="absolute top-2 right-2 h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="flex items-start space-x-2 pr-6">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Bạn có thể chat ngay mà không cần đăng nhập. 
                      <span className="font-medium"> Đăng nhập để lưu lịch sử chat.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 ? null : (
            <div className="max-w-3xl mx-auto pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex gap-4 mb-6 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">U</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.role === 'user' ? (
                        <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        </div>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                          <p className="whitespace-pre-wrap text-gray-900 text-sm leading-relaxed mb-3">{message.content}</p>
                          
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-2 mb-3">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <p className="text-sm font-semibold text-gray-700">
                                Nguồn tham khảo ({message.sources.length})
                              </p>
                            </div>
                            <div className="space-y-2">
                              {message.sources.map((source) => (
                                <div key={source.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                                  <p className="font-medium text-blue-900 text-sm mb-1">
                                    {source.title || 'Văn bản pháp luật'}
                                  </p>
                                  {source.so_hieu && (
                                    <p className="text-xs text-blue-700">
                                      Số hiệu: {source.so_hieu}
                                    </p>
                                  )}
                                  {source.loai_van_ban && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      {source.loai_van_ban}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="max-w-3xl mx-auto pb-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-gray-600 text-sm">Đang tìm kiếm và phân tích...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at bottom like ChatGPT */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0 shadow-lg" style={{ flexShrink: 0 }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSubmit} className="flex items-end gap-2 mb-2">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi về pháp luật..."
                className="w-full min-h-[52px] max-h-[200px] resize-none border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl pr-12 py-3 px-4 text-sm transition-all bg-white"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[52px] w-[52px] bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-full shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          
          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center mb-3">
            Legal Chatbot có thể mắc lỗi. Vui lòng kiểm tra thông tin quan trọng.
          </p>
          
          {/* Action buttons like ChatGPT */}
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Paperclip className="h-4 w-4 mr-1.5" />
              Đính kèm
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Tìm kiếm
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <BookOpen className="h-4 w-4 mr-1.5" />
              Học tập
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Mic className="h-4 w-4 mr-1.5" />
              Giọng nói
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
