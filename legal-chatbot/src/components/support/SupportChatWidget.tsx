'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, Send, Loader2, User, Bot } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface SupportMessage {
  id: string
  content: string
  sender_type: 'user' | 'admin' | 'system'
  sender_name: string | null
  created_at: string
  sender?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface SupportConversation {
  id: string
  status: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
}

export function SupportChatWidget() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [conversation, setConversation] = useState<SupportConversation | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversation khi mở chat
  useEffect(() => {
    if (isOpen && !conversation) {
      loadOrCreateConversation()
    }
  }, [isOpen])

  // Load messages khi có conversation
  useEffect(() => {
    if (conversation) {
      loadMessages()
      subscribeToMessages()
    }
  }, [conversation?.id])

  // Scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadOrCreateConversation = async () => {
    try {
      setIsLoading(true)
      
      // Tìm conversation hiện có
      const response = await fetch(`/api/support/conversations?userId=${user?.id || ''}&status=open`)
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        setConversation(data.data[0])
      } else {
        // Tạo conversation mới
        const createResponse = await fetch('/api/support/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || null,
            userName: profile?.full_name || user?.email?.split('@')[0] || 'Người dùng',
            userEmail: user?.email || null
          })
        })
        const createData = await createResponse.json()
        if (createData.success) {
          setConversation(createData.data)
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải cuộc trò chuyện',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!conversation) return

    try {
      const response = await fetch(`/api/support/messages?conversationId=${conversation.id}`)
      const data = await response.json()
      if (data.data) {
        setMessages(data.data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!conversation) return

    const channel = supabase
      .channel(`support_messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as SupportMessage
          setMessages(prev => [...prev, newMessage])
          
          // Đánh dấu đã đọc nếu là tin nhắn từ admin
          if (newMessage.sender_type === 'admin') {
            fetch(`/api/support/messages/${newMessage.id}/read`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conversation.id })
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSending || !conversation) return

    const messageContent = input.trim()
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: user?.id || null,
          senderType: 'user',
          senderName: profile?.full_name || user?.email?.split('@')[0] || 'Người dùng',
          content: messageContent
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Không thể gửi tin nhắn')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi tin nhắn',
        variant: 'destructive'
      })
      setInput(messageContent) // Khôi phục input nếu lỗi
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Hỗ Trợ Trực Tuyến
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {conversation && (
              <Badge variant="secondary" className="mt-2 w-fit">
                {conversation.status === 'open' ? 'Đang mở' : conversation.status}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Chào mừng đến với hỗ trợ trực tuyến!</p>
                      <p className="text-sm mt-1">Gửi tin nhắn để bắt đầu...</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isUser = message.sender_type === 'user'
                      const senderName = message.sender?.full_name || message.sender_name || 
                        (isUser ? (profile?.full_name || user?.email?.split('@')[0] || 'Bạn') : 'Hỗ trợ viên')

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                              {isUser ? (
                                <User className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Bot className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="text-xs text-gray-500">{senderName}</span>
                            </div>
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isUser
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="border-t p-4 bg-white">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Nhập tin nhắn của bạn..."
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e)
                        }
                      }}
                      disabled={isSending}
                    />
                    <Button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="self-end"
                      size="icon"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Nhấn Enter để gửi, Shift+Enter để xuống dòng
                  </p>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

