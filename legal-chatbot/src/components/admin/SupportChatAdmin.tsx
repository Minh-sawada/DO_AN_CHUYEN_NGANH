'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  User, 
  Bot, 
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface SupportMessage {
  id: string
  content: string
  sender_type: 'user' | 'admin' | 'system'
  sender_name: string | null
  created_at: string
  is_read: boolean
  sender?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface SupportConversation {
  id: string
  status: string
  priority: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  assigned_to: string | null
  last_message_at: string
  created_at: string
  profiles?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
  assigned_admin?: {
    full_name: string | null
    email: string | null
  }
  unread_count?: number
}

export function SupportChatAdmin() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<SupportConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [messageLimit, setMessageLimit] = useState(50)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [totalCount, setTotalCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const convPollRef = useRef<NodeJS.Timeout | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const lastMessagesSigRef = useRef<string>('')

  // Global subscription: update list when ANY conversation receives a new message
  useEffect(() => {
    const channel = supabase
      .channel('support_messages:global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const msg = payload.new as any
          setConversations(prev => {
            let changed = false
            const mapped = prev.map((c) => {
              if (c.id !== msg.conversation_id) return c
              changed = true
              const conv: any = { ...c }
              conv.last_message = {
                content: msg.content,
                created_at: msg.created_at,
                sender_type: msg.sender_type,
                sender_name: msg.sender_name || null
              }
              conv.last_message_at = msg.created_at
              const isActive = selectedConversation?.id === conv.id
              const fromUser = msg.sender_type === 'user'
              conv.unread_count = isActive ? 0 : Math.max(0, (conv.unread_count || 0) + (fromUser ? 1 : 0))
              return conv
            })
            if (!changed) return prev
            // Stable sort by last_message_at desc
            return [...mapped].sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    loadConversations()
  }, [statusFilter, page, limit])

  useEffect(() => {
    if (selectedConversation) {
      selectedIdRef.current = selectedConversation.id
      setMessages([])
      console.log('[Admin] selectedConversation', selectedConversation.id)
      loadMessages()
      const cleanup = subscribeToMessages()
      markAsRead()
      return () => {
        if (typeof cleanup === 'function') cleanup()
      }
    } else {
      selectedIdRef.current = null
      setMessages([])
    }
  }, [selectedConversation?.id])

  // Polling định kỳ cho messages của cuộc trò chuyện đang chọn (kết hợp với WS)
  useEffect(() => {
    if (!selectedConversation) return

    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      loadMessages()
    }, 7000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [selectedConversation?.id])

  // Polling định kỳ cho danh sách conversations để luôn cập nhật preview/unread
  useEffect(() => {
    if (convPollRef.current) clearInterval(convPollRef.current)
    convPollRef.current = setInterval(() => {
      loadConversations({ silent: true })
    }, 10000)

    return () => {
      if (convPollRef.current) {
        clearInterval(convPollRef.current)
        convPollRef.current = null
      }
    }
  }, [statusFilter, page, limit])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setIsLoading(true)
      }
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('limit', String(limit))
      params.set('offset', String((page - 1) * limit))
      const url = `/api/support/conversations${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (data.data) {
        setConversations(data.data)
        setTotalCount(data.count || 0)
        // Auto-select the first conversation ONLY if none is selected
        if (!selectedConversation && data.data.length > 0) {
          setSelectedConversation(data.data[0])
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách cuộc trò chuyện',
        variant: 'destructive'
      })
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }

  const loadMessages = async () => {
    const convId = selectedIdRef.current
    if (!convId) return

    try {
      console.log('[Admin] loadMessages for', convId)
      const response = await fetch(`/api/support/messages?conversationId=${convId}`)
      const data = await response.json()
      if (selectedIdRef.current !== convId) return
      if (data.data) {
        const list = data.data as SupportMessage[]
        const last = list.length ? (list[list.length - 1] as any) : null
        const sig = `${list.length}:${last?.id ?? ''}:${last?.created_at ?? ''}`
        if (sig !== lastMessagesSigRef.current) {
          lastMessagesSigRef.current = sig
          setMessages(list)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const subscribeToMessages = () => {
    const convId = selectedIdRef.current
    if (!convId) return

    console.log('[Admin] subscribeToMessages ->', convId)
    const channel = supabase
      .channel(`support_messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${convId}`
        },
        (payload) => {
          const newMessage = payload.new as SupportMessage
          if (selectedIdRef.current !== convId) return
          console.log('[Admin WS INSERT]', {
            conversationId: convId,
            messageId: (newMessage as any)?.id,
            created_at: (newMessage as any)?.created_at,
            sender_type: (newMessage as any)?.sender_type,
          })
          // Dedupe by ID to avoid double messages when polling/fetch and WS overlap
          setMessages(prev => {
            if (prev.some(m => m.id === (newMessage as any).id)) return prev
            return [...prev, newMessage]
          })
          // Cập nhật preview và unread cho list bên trái mà không reload toàn bộ
          setConversations(prev => prev.map(conv => {
            if (conv.id !== convId) return conv
            const updated: any = { ...conv }
            updated.last_message = {
              content: newMessage.content,
              created_at: newMessage.created_at,
              sender_type: newMessage.sender_type,
              sender_name: newMessage.sender_name || null
            }
            // Đang mở cuộc trò chuyện này => set unread = 0
            updated.unread_count = 0
            return updated
          }))

          // Đánh dấu đã đọc nếu là tin nhắn từ admin
          if (newMessage.sender_type === 'admin') {
            fetch(`/api/support/messages/${newMessage.id}/read`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: convId })
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[Admin WS status]', status, `support_messages:${convId}`)
        setWsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
      console.log('[Admin WS unsubscribe]', `support_messages:${convId}`)
      setWsConnected(false)
    }
  }

  const markAsRead = async () => {
    const convId = selectedIdRef.current
    if (!convId) return

    try {
      await fetch(`/api/support/messages/${convId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId })
      })
      // Reload conversations để cập nhật unread count
      loadConversations()
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSending || !selectedConversation) return

    const messageContent = input.trim()
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          senderId: user?.id || null,
          senderType: 'admin',
          senderName: profile?.full_name || user?.email || 'Admin',
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
      setInput(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  const updateConversation = async (field: string, value: any) => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/support/conversations/${selectedConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })

      const data = await response.json()
      if (data.success) {
        setSelectedConversation(data.data)
        loadConversations()
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật cuộc trò chuyện'
        })
      }
    } catch (error) {
      console.error('Error updating conversation:', error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      conv.user_name?.toLowerCase().includes(search) ||
      conv.user_email?.toLowerCase().includes(search) ||
      conv.profiles?.full_name?.toLowerCase().includes(search) ||
      conv.profiles?.email?.toLowerCase().includes(search)
    )
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const canPrev = page > 1
  const canNext = page < totalPages

  const truncate = (s?: string | null, n: number = 80) => {
    if (!s) return ''
    return s.length > n ? s.slice(0, n - 1) + '…' : s
  }

  const visibleMessages = messages.length > messageLimit
    ? messages.slice(messages.length - messageLimit)
    : messages

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-140px)] min-h-0 overflow-hidden">
      {/* Conversations List */}
      <Card className="lg:col-span-1 flex flex-col h-full min-h-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Cuộc Trò Chuyện
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${wsConnected ? 'text-green-700 border-green-300 bg-green-50' : 'text-yellow-800 border-yellow-300 bg-yellow-50'}`}>
              Realtime: {wsConnected ? 'Connected' : 'Retrying'}
            </span>
          </CardTitle>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="open">Đang mở</SelectItem>
                <SelectItem value="waiting">Đang chờ</SelectItem>
                <SelectItem value="closed">Đã đóng</SelectItem>
                <SelectItem value="resolved">Đã giải quyết</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Pagination controls (moved to top) */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">{`Trang ${page}/${totalPages}`} · {totalCount} cuộc trò chuyện</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => canPrev && setPage(page - 1)}>
                Trước
              </Button>
              <Button variant="outline" size="sm" disabled={!canNext} onClick={() => canNext && setPage(page + 1)}>
                Sau
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
          <div className="h-full overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center text-gray-500 p-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có cuộc trò chuyện nào</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {conv.profiles?.full_name || conv.user_name || 'Người dùng'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conv.profiles?.email || conv.user_email || 'Chưa đăng nhập'}
                        </p>
                        {(conv as any).last_message && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {(() => {
                              const lm: any = (conv as any).last_message || {}
                              const senderLabel = lm.sender_type === 'admin'
                                ? 'Bạn'
                                : (conv.profiles?.full_name || conv.user_name || 'Người dùng')
                              return truncate(`${senderLabel}: ${lm.content || ''}`, 80)
                            })()}
                          </p>
                        )}
                      </div>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={conv.status === 'open' ? 'default' : 'secondary'}>
                        {conv.status}
                      </Badge>
                      <Badge variant="outline">{conv.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTime(conv.last_message_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pagination controls moved to header */}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col h-full min-h-0 overflow-hidden">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedConversation.profiles?.full_name || selectedConversation.user_name || 'Người dùng'}
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.profiles?.email || selectedConversation.user_email || 'Chưa đăng nhập'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedConversation.status}
                    onValueChange={(value) => updateConversation('status', value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Đang mở</SelectItem>
                      <SelectItem value="waiting">Đang chờ</SelectItem>
                      <SelectItem value="closed">Đã đóng</SelectItem>
                      <SelectItem value="resolved">Đã giải quyết</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedConversation.priority}
                    onValueChange={(value) => updateConversation('priority', value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Thấp</SelectItem>
                      <SelectItem value="normal">Bình thường</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                      <SelectItem value="urgent">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto max-h-full min-h-0">
                <div className="space-y-4">
                  {/* Load more older button if many messages */}
                  {messages.length > messageLimit && (
                    <div className="flex justify-center">
                      <Button variant="outline" size="sm" onClick={() => setMessageLimit((v) => v + 50)}>
                        Tải thêm
                      </Button>
                    </div>
                  )}
                  {visibleMessages.map((message) => {
                    const isAdmin = message.sender_type === 'admin'
                    const senderName = isAdmin
                      ? 'Bạn'
                      : (message.sender?.full_name || message.sender_name || (selectedConversation.profiles?.full_name || selectedConversation.user_name || 'Người dùng'))

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`flex flex-col max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-center gap-2 mb-1 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                            {isAdmin ? (
                              <Bot className="h-4 w-4 text-blue-500" />
                            ) : (
                              <User className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-xs text-gray-500">{senderName}</span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isAdmin
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-xs mt-1 ${isAdmin ? 'text-blue-100' : 'text-gray-400'}`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              {/* Input */}
              <form onSubmit={handleSend} className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập phản hồi..."
                    className="min-h-[80px] resize-none"
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
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

