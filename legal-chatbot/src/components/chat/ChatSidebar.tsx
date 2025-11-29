'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  MoreVertical,
  ChevronRight,
  History
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatSidebarProps {
  currentSessionId: string | null
  onNewChat: () => void
  onSelectSession: (sessionId: string) => void
  refreshTrigger?: number // Trigger refresh khi giá trị này thay đổi
}

export function ChatSidebar({ currentSessionId, onNewChat, onSelectSession, refreshTrigger }: ChatSidebarProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = async () => {
    if (!user) {
      setSessions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/chat/sessions-public?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        // Sắp xếp theo updated_at mới nhất trước
        const sortedSessions = (data.sessions || []).sort((a: ChatSession, b: ChatSession) => {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        })
        setSessions(sortedSessions)
      } else {
        setSessions([])
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
  }, [user, refreshTrigger]) // Refresh khi user thay đổi hoặc refreshTrigger thay đổi

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng đăng nhập để xóa cuộc trò chuyện.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Gửi userId trong query params để fallback nếu cookies không có
      const response = await fetch(`/api/chat/sessions-fixed/${sessionId}?userId=${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSessions(prev => prev.filter(s => s.id !== sessionId))
          toast({
            title: 'Đã xóa',
            description: 'Cuộc trò chuyện đã được xóa.',
          })
          
          // Nếu đang xem session bị xóa, chuyển sang new chat
          if (currentSessionId === sessionId) {
            onNewChat()
          }
        } else {
          throw new Error(data.error || 'Failed to delete')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa cuộc trò chuyện. Vui lòng thử lại.',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: vi 
      })
    } catch (error) {
      return 'Không xác định'
    }
  }

  const formatFullDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      // Nếu trong 24 giờ, chỉ hiển thị giờ
      if (diffInHours < 24) {
        return date.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
      
      // Nếu quá 24 giờ, hiển thị ngày tháng
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Không xác định'
    }
  }

  const getSessionTitle = (session: ChatSession) => {
    if (session.title && session.title.trim() && session.title !== 'Cuộc trò chuyện mới') {
      // Giới hạn 25 ký tự cho title để không bị che nút xóa
      return session.title.length > 25 
        ? session.title.substring(0, 25) + '...' 
        : session.title
    }
    return 'Cuộc trò chuyện mới'
  }

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col h-full border-r border-gray-200 dark:border-gray-800">
      {/* New Chat Button */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <Button
          onClick={onNewChat}
          className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white justify-start gap-2 shadow-sm"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          <span>Cuộc trò chuyện mới</span>
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
              Đang tải...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Chưa có cuộc trò chuyện nào</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const isActive = currentSessionId === session.id
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`
                      group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors
                      ${isActive 
                        ? 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-250 dark:hover:bg-gray-750' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    <div className="flex-1 min-w-0 mr-2">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {getSessionTitle(session)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(session.updated_at)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatFullDateTime(session.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

