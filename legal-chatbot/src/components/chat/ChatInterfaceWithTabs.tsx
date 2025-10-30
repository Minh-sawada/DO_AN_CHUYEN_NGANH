'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, History } from 'lucide-react'
import { ChatInterface } from './ChatInterface'
import { ChatHistory } from './ChatHistory'

export function ChatInterfaceWithTabs() {
  return (
    <Tabs defaultValue="chat" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="chat" className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4" />
          <span>Chat</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center space-x-2">
          <History className="h-4 w-4" />
          <span>Lịch sử</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="mt-0">
        <ChatInterface />
      </TabsContent>

      <TabsContent value="history" className="mt-0">
        <div className="h-[700px] bg-white/50 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <ChatHistory />
        </div>
      </TabsContent>
    </Tabs>
  )
}
