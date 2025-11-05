'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, History, Lock } from 'lucide-react'
import { ChatInterface } from './ChatInterface'
import { ChatHistory } from './ChatHistory'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function ChatInterfaceWithTabs() {
  const { user } = useAuth()
  const isAuthenticated = !!user

  return (
    <Tabs defaultValue="chat" className="w-full h-full flex flex-col" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs chỉ hiển thị khi có history */}
      {isAuthenticated && (
        <div className="border-b border-gray-200 bg-white px-4 flex-shrink-0">
          <TabsList className={`grid w-full max-w-md ${isAuthenticated ? 'grid-cols-2' : 'grid-cols-1'} bg-transparent h-auto p-0`}>
            <TabsTrigger value="chat" className="flex items-center space-x-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            {isAuthenticated && (
              <TabsTrigger value="history" className="flex items-center space-x-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent">
                <History className="h-4 w-4" />
                <span>Lịch sử</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>
      )}

      <TabsContent value="chat" className="mt-0 p-0 flex-1 flex flex-col overflow-hidden" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', marginTop: 0, padding: 0, minHeight: 0 }}>
        <ChatInterface />
      </TabsContent>

      {isAuthenticated ? (
        <TabsContent value="history" className="mt-0 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-white p-4 sm:p-6">
            <ChatHistory />
          </div>
        </TabsContent>
      ) : null}
    </Tabs>
  )
}
