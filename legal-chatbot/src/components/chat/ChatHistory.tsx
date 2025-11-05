'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  MessageSquare, 
  Clock, 
  User, 
  Bot, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  RefreshCw,
  Search,
  Calendar,
  FileText,
  ArrowRight,
  X
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/components/auth/AuthProvider'

interface ChatSource {
  id: number
  title: string
  article_reference?: string
  source?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  created_at: string
}

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  chat_messages: ChatMessage[]
}

export function ChatHistory() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<string>('all')

  const fetchSessions = async () => {
    // Chỉ fetch nếu đã đăng nhập
    if (!user) {
      setSessions([])
      setFilteredSessions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/chat/sessions-public?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        const fetchedSessions = data.sessions || []
        setSessions(fetchedSessions)
        setFilteredSessions(fetchedSessions)
      } else {
        // Nếu chưa đăng nhập hoặc không có session, không hiển thị lỗi
        if (data.error?.includes('No session found') || data.error?.includes('Unauthorized') || data.error?.includes('login')) {
          setSessions([])
          setFilteredSessions([])
        } else {
          console.error('Failed to fetch sessions:', data.error || 'Unknown error')
          setSessions([])
          setFilteredSessions([])
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
      setFilteredSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [user])

  // Filter sessions based on search and time filter
  useEffect(() => {
    let filtered = [...sessions]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(session => {
        const matchesTitle = session.title?.toLowerCase().includes(query)
        const matchesMessages = session.chat_messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        )
        return matchesTitle || matchesMessages
      })
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.updated_at)
        const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
        
        switch (timeFilter) {
          case 'today':
            return diffDays === 0
          case 'week':
            return diffDays <= 7
          case 'month':
            return diffDays <= 30
          default:
            return true
        }
      })
    }

    setFilteredSessions(filtered)
  }, [sessions, searchQuery, timeFilter])

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) return

    try {
      const response = await fetch(`/api/chat/sessions-fixed/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const updatedSessions = sessions.filter(s => s.id !== sessionId)
        setSessions(updatedSessions)
        if (selectedSession === sessionId) {
          setSelectedSession(null)
        }
        toast({
          title: '✅ Thành công',
          description: 'Đã xóa cuộc trò chuyện thành công!'
        })
      } else {
        const errorData = await response.json()
        console.error('Failed to delete session:', errorData)
        toast({
          title: '❌ Lỗi',
          description: 'Không thể xóa cuộc trò chuyện. Vui lòng thử lại.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Có lỗi xảy ra khi xóa cuộc trò chuyện.')
    }
  }

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: vi 
    })
  }

  const formatFullDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi })
  }

  const continueChat = (session: ChatSession) => {
    // Scroll to chat interface and focus on input
    const chatInput = document.querySelector('textarea') as HTMLTextAreaElement
    if (chatInput) {
      chatInput.focus()
      chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    toast({
      title: '💬 Tiếp tục chat',
      description: `Bạn có thể tiếp tục chat với chủ đề "${session.title}"`
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span>Lịch sử Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Đang tải...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm flex-1 flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl">Lịch sử Chat</span>
                <p className="text-sm text-gray-600 font-normal mt-0.5">
                  {filteredSessions.length} cuộc trò chuyện
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSessions}
              className="flex items-center space-x-2 shadow-sm hover:shadow-md transition-shadow"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 sm:p-6">
          {/* Search and Filter */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm trong lịch sử chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc theo thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="week">7 ngày qua</SelectItem>
                  <SelectItem value="month">30 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Sessions List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Đang tải...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
          {sessions.length === 0 ? (
                  <>
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Chưa có cuộc trò chuyện nào</p>
                    <p className="text-sm mt-2 text-gray-400">Bắt đầu chat với chatbot để tạo lịch sử</p>
                    {!user && (
                      <p className="text-xs mt-3 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg inline-block">
                        💡 Lưu ý: Cần đăng nhập để lưu lịch sử chat
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Không tìm thấy kết quả</p>
                    <p className="text-sm mt-2 text-gray-400">
                      Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setTimeFilter('all')
                      }}
                      className="mt-4"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Xóa bộ lọc
                    </Button>
                  </>
                )}
            </div>
          ) : (
              <div className="space-y-3 pr-2">
                {filteredSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-colors"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="mt-1">
                        {expandedSessions.has(session.id) ? (
                              <ChevronDown className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">{session.title || 'Cuộc trò chuyện'}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                              <span className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(session.updated_at)}</span>
                            </span>
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                <MessageSquare className="h-3 w-3 mr-1" />
                              {session.chat_messages.length} tin nhắn
                            </Badge>
                              {session.chat_messages.filter(m => m.role === 'user').length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                {session.chat_messages.filter(m => m.role === 'user').length} câu hỏi
                              </Badge>
                              )}
                            </div>
                            {!expandedSessions.has(session.id) && session.chat_messages.length > 0 && (
                              <p className="text-sm text-gray-600 truncate italic">
                                "{session.chat_messages[0].content.substring(0, 60)}..."
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              continueChat(session)
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Tiếp tục chat"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Xóa cuộc trò chuyện"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                        </div>
                    </div>
                  </div>
                  
                  {expandedSessions.has(session.id) && (
                      <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
                        <ScrollArea className="h-[400px] sm:h-[500px]">
                          <div className="p-4 sm:p-6 space-y-4">
                            {session.chat_messages.map((message, index) => (
                            <div 
                              key={message.id} 
                                className={`flex items-start space-x-3 animate-in fade-in slide-in-from-bottom duration-300 ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                              {message.role === 'assistant' && (
                                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-blue-200">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                              )}
                              
                              <div 
                                  className={`max-w-[85%] rounded-xl p-4 shadow-sm ${
                                  message.role === 'user' 
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                                      : 'bg-white border border-gray-200 text-gray-900'
                                }`}
                              >
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                {message.sources && message.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-300/30">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <FileText className="h-3 w-3 text-blue-500" />
                                        <p className="text-xs font-semibold text-gray-700">
                                          Nguồn tham khảo ({message.sources.length})
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                      {message.sources.slice(0, 3).map((source: ChatSource, index: number) => (
                                          <div key={index} className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 rounded-lg border border-blue-100">
                                            <p className="font-medium text-blue-900">{source.title || 'Văn bản pháp luật'}</p>
                                          {source.article_reference && (
                                              <p className="text-blue-700 mt-1">{source.article_reference}</p>
                                          )}
                                          {source.source && (
                                              <p className="text-blue-600 italic mt-1">{source.source}</p>
                                          )}
                                        </div>
                                      ))}
                                      {message.sources.length > 3 && (
                                        <p className="text-xs text-gray-500 italic">
                                          ... và {message.sources.length - 3} nguồn khác
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                  <p className="text-xs opacity-70 mt-2">
                                    {formatFullDate(message.created_at)}
                                  </p>
                              </div>
                              
                              {message.role === 'user' && (
                                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-green-200">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
