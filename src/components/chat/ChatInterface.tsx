'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Loader2, FileText, ExternalLink, Brain } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

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
    <div className="flex flex-col h-[600px] bg-white/50 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-6">
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
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                  {message.role === 'user' ? (
                    <div className="flex items-end space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">U</span>
                      </div>
                      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-lg">
                        <CardContent className="p-4">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {formatTime(message.timestamp)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex items-end space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      <Card className="bg-white border border-gray-200 shadow-lg">
                        <CardContent className="p-4">
                          <p className="whitespace-pre-wrap text-gray-900 mb-3">{message.content}</p>
                          
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center space-x-2 mb-3">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <p className="text-sm font-medium text-gray-700">
                                  Nguồn tham khảo
                                </p>
                              </div>
                              <div className="space-y-2">
                                {message.sources.map((source) => (
                                  <div key={source.id} className="bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                      <div className="flex-1">
                                        <p className="font-medium text-blue-900 text-sm">
                                          {source.title || 'Văn bản pháp luật'}
                                        </p>
                                        {source.article_reference && (
                                          <p className="text-xs text-blue-700 mt-1">
                                            {source.article_reference}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-3">
                            {formatTime(message.timestamp)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <Card className="bg-white border border-gray-200 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-gray-600 text-sm">Đang tìm kiếm và phân tích...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi về pháp luật..."
              className="w-full min-h-[50px] max-h-[120px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl pr-12"
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
            className="px-6 h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl shadow-lg disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
