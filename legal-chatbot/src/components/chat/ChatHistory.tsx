'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Clock, 
  User, 
  Bot, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const url = user?.id ? `/api/chat/sessions-public?userId=${user.id}` : '/api/chat/sessions-public'
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setSessions(data.sessions || [])
      } else {
        // Nếu chưa đăng nhập, không hiển thị lỗi
        if (data.error?.includes('No session found') || data.error?.includes('Unauthorized') || data.error?.includes('login')) {
          setSessions([])
        } else {
          console.error('Failed to fetch sessions:', data.error || 'Unknown error')
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

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
        setSessions(sessions.filter(s => s.id !== sessionId))
        if (selectedSession === sessionId) {
          setSelectedSession(null)
        }
        // Show success message
        alert('Đã xóa cuộc trò chuyện thành công!')
      } else {
        const errorData = await response.json()
        console.error('Failed to delete session:', errorData)
        alert('Không thể xóa cuộc trò chuyện. Vui lòng thử lại.')
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Lịch sử Chat</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSessions}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Làm mới</span>
            </Button>
          </CardTitle>
          <CardDescription>
            Xem và quản lý lịch sử các cuộc trò chuyện với chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có cuộc trò chuyện nào</p>
              <p className="text-sm mt-2">Bắt đầu chat với chatbot để tạo lịch sử</p>
              <p className="text-xs mt-1 text-gray-400">Lưu ý: Cần đăng nhập để lưu lịch sử chat</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSession(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedSessions.has(session.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{session.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(session.updated_at)}</span>
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {session.chat_messages.length} tin nhắn
                            </Badge>
                            {session.chat_messages.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {session.chat_messages.filter(m => m.role === 'user').length} câu hỏi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {expandedSessions.has(session.id) && (
                    <div className="border-t border-gray-200">
                      <ScrollArea className="h-96">
                        <div className="p-4 space-y-4">
                          {session.chat_messages.map((message) => (
                            <div 
                              key={message.id} 
                              className={`flex items-start space-x-3 ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {message.role === 'assistant' && (
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Bot className="h-4 w-4 text-blue-600" />
                                </div>
                              )}
                              
                              <div 
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  message.role === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                {message.sources && message.sources.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-600 mb-1">
                                      Nguồn tham khảo ({message.sources.length}):
                                    </p>
                                    <div className="space-y-1">
                                      {message.sources.slice(0, 3).map((source: ChatSource, index: number) => (
                                        <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                                          <p className="font-medium text-gray-800">{source.title}</p>
                                          {source.article_reference && (
                                            <p className="text-gray-600">{source.article_reference}</p>
                                          )}
                                          {source.source && (
                                            <p className="text-gray-500 italic">{source.source}</p>
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
                              </div>
                              
                              {message.role === 'user' && (
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-green-600" />
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
        </CardContent>
      </Card>
    </div>
  )
}
