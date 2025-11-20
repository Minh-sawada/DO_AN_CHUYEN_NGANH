'use client'

import { useState, useEffect } from 'react'
import { ChatSidebar } from './ChatSidebar'
import { ChatInterface } from './ChatInterface'
import { useAuth } from '@/components/auth/AuthProvider'

export function ChatLayout() {
  const { user } = useAuth()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleNewChat = () => {
    setCurrentSessionId(null)
    // ChatInterface sẽ tự động clear messages khi sessionId = null
  }

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
  }

  const handleSessionCreated = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    // Trigger refresh sidebar để hiển thị session mới
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-950">
      {/* Sidebar - chỉ hiển thị khi đã đăng nhập */}
      {user && (
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden`}>
          <ChatSidebar
            currentSessionId={currentSessionId}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatInterface 
          sessionId={currentSessionId}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  )
}

