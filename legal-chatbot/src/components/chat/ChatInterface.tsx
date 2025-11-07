'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, FileText, ExternalLink, Brain, Info, X, Paperclip, Search, BookOpen, Mic } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/AuthProvider'

// Type definitions for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

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
  
  // Voice recognition states
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptTimeRef = useRef<number>(0)

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

  // Initialize Speech Recognition
  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API không được hỗ trợ trong trình duyệt này')
      return
    }

    console.log('Đang khởi tạo Speech Recognition...')
    const recognition = new SpeechRecognition()
    recognition.continuous = false // Đổi sang false để tránh lặp lại
    recognition.interimResults = true
    recognition.lang = 'vi-VN' // Vietnamese language

    recognition.onstart = () => {
      console.log('Speech Recognition đã bắt đầu')
      setIsListening(true)
      setTranscript('')
      lastTranscriptTimeRef.current = Date.now()
      
      // Reset timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      
      // Tự động tắt sau 3 giây không có giọng nói
      silenceTimeoutRef.current = setTimeout(() => {
        console.log('Hết thời gian chờ (3 giây không có giọng nói), tự động dừng...')
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop()
        }
      }, 3000)
      
      toast({
        title: 'Đang nghe...',
        description: 'Nói câu hỏi của bạn vào microphone (tự động tắt sau 3 giây im lặng).',
        duration: 3000,
      })
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset timeout mỗi khi có kết quả
      lastTranscriptTimeRef.current = Date.now()
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      
      // Set lại timeout 3 giây
      silenceTimeoutRef.current = setTimeout(() => {
        console.log('Hết thời gian chờ (3 giây không có giọng nói), tự động dừng...')
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop()
        }
      }, 3000)
      
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        setInput(prev => {
          // Tránh lặp lại text bằng cách kiểm tra text cuối cùng
          const trimmed = finalTranscript.trim()
          if (prev.endsWith(trimmed)) {
            return prev // Không thêm nếu đã có
          }
          return prev + (prev ? ' ' : '') + trimmed
        })
        setTranscript('')
      } else {
        setTranscript(interimTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      
      if (event.error === 'no-speech') {
        toast({
          title: 'Không phát hiện giọng nói',
          description: 'Không có âm thanh được phát hiện. Vui lòng nói lại.',
          variant: 'destructive',
          duration: 3000,
        })
      } else if (event.error === 'not-allowed') {
        const isHttp = window.location.protocol === 'http:'
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        
        let description = 'Trình duyệt không cho phép truy cập microphone. '
        
        if (isHttp && !isLocalhost) {
          description += 'VẤN ĐỀ: Bạn đang dùng HTTP với IP. Trình duyệt chặn microphone trên HTTP. '
          description += 'GIẢI PHÁP: 1) Dùng localhost:3000 thay vì IP, hoặc 2) Chạy "npm run dev:https" để dùng HTTPS. '
          description += 'Xem file HTTPS_SETUP.md để biết chi tiết.'
        } else if (isHttp && isLocalhost) {
          description += 'Cách khắc phục: 1) Click nút "Đặt lại quyền", 2) Refresh trang, 3) Click "Giọng nói" lại và chọn "Cho phép".'
        } else {
          description += 'Cách khắc phục: 1) Click nút "Đặt lại quyền" ở trang cài đặt, 2) Refresh trang (F5), 3) Click "Giọng nói" lại và chọn "Cho phép".'
        }
        
        toast({
          title: 'Quyền truy cập microphone bị từ chối',
          description,
          variant: 'destructive',
          duration: 12000,
        })
      } else if (event.error === 'aborted') {
        // Không hiển thị toast cho lỗi aborted (người dùng tự dừng)
      } else {
        toast({
          title: 'Lỗi nhận diện giọng nói',
          description: `Lỗi: ${event.error}. Vui lòng thử lại.`,
          variant: 'destructive',
          duration: 4000,
        })
      }
    }

    recognition.onend = () => {
      console.log('Speech Recognition đã kết thúc')
      setIsListening(false)
      
      // Clear timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      
      // Nếu có transcript tạm thời, thêm vào input
      if (transcript) {
        setInput(prev => {
          const trimmed = transcript.trim()
          if (prev.endsWith(trimmed)) {
            return prev
          }
          return prev + (prev ? ' ' : '') + trimmed
        })
      }
      
      setTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [toast])

  // Check microphone permission
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (result.state === 'denied') {
          toast({
            title: 'Quyền truy cập bị từ chối',
            description: 'Vui lòng click "Đặt lại quyền" ở trang cài đặt, sau đó refresh trang và thử lại.',
            variant: 'destructive',
            duration: 6000,
          })
          return false
        }
        return result.state === 'granted'
      }
      return true
    } catch (error) {
      // Permission API không được hỗ trợ, tiếp tục thử
      return true
    }
  }

  // Toggle voice recognition
  const toggleVoiceRecognition = async () => {
    console.log('Click vào nút Giọng nói')
    console.log('recognitionRef.current:', recognitionRef.current)
    console.log('isListening:', isListening)
    
    if (!recognitionRef.current) {
      console.error('Speech Recognition chưa được khởi tạo')
      toast({
        title: 'Trình duyệt không hỗ trợ',
        description: 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.',
        variant: 'destructive',
        duration: 5000,
      })
      return
    }

    if (isListening) {
      console.log('Dừng recognition...')
      recognitionRef.current.stop()
      setIsListening(false)
      // Nếu có transcript tạm thời, thêm vào input
      if (transcript) {
        setInput(prev => prev + ' ' + transcript)
        setTranscript('')
      }
      toast({
        title: 'Đã dừng ghi âm',
        description: 'Text đã được thêm vào ô nhập.',
        duration: 2000,
      })
    } else {
      console.log('Bắt đầu recognition...')
      toast({
        title: 'Đang khởi động...',
        description: 'Đang yêu cầu quyền truy cập microphone...',
        duration: 2000,
      })
      
      // Kiểm tra quyền để hiển thị cảnh báo, nhưng vẫn thử start()
      const hasPermission = await checkMicrophonePermission()
      console.log('hasPermission:', hasPermission)
      
      // Chú ý: Ngay cả khi permission API trả về false, vẫn thử start()
      // vì trình duyệt sẽ tự động hỏi quyền khi start() được gọi
      // Nếu quyền đã bị từ chối, start() sẽ throw error và chúng ta xử lý ở catch

      try {
        console.log('Gọi recognition.start()...')
        recognitionRef.current.start()
        console.log('recognition.start() đã được gọi - đợi trình duyệt hỏi quyền...')
      } catch (error: any) {
        console.error('Error starting recognition:', error)
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        
        // Xử lý lỗi cụ thể
        if (error.name === 'NotAllowedError' || error.message?.includes('not allowed')) {
          toast({
            title: 'Cần quyền truy cập microphone',
            description: 'Vui lòng cho phép truy cập microphone trong popup trình duyệt hoặc cài đặt trang web.',
            variant: 'destructive',
            duration: 6000,
          })
        } else {
          toast({
            title: 'Lỗi',
            description: `Không thể bắt đầu nhận diện giọng nói: ${error.message || error.name}. Mở Console (F12) để xem chi tiết.`,
            variant: 'destructive',
            duration: 6000,
          })
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Nếu đang nghe, dừng lại và thêm transcript vào input
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      if (transcript) {
        setInput(prev => prev + ' ' + transcript)
        setTranscript('')
      }
      return
    }
    
    const finalInput = input.trim() + (transcript ? ' ' + transcript.trim() : '')
    if (!finalInput || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: finalInput,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setTranscript('')
    setIsLoading(true)

    try {
      // Lấy user_id từ auth để log activity
      const userId = user?.id || null
      
      // Gửi đến API route để có logging
      const response = await fetch('/api/chat-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          userId: userId // Gửi userId để log activity
        }),
      })

      if (!response.ok) {
        throw new Error('Lỗi khi gửi tin nhắn')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.error || 'Xin lỗi, không thể xử lý câu hỏi của bạn.',
        sources: data.sources || [],
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
                value={input + (transcript ? ' ' + transcript : '')}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Đang nghe..." : "Nhập câu hỏi về pháp luật..."}
                className="w-full min-h-[52px] max-h-[200px] resize-none border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl pr-12 py-3 px-4 text-sm transition-all bg-white"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              {isListening && (
                <div className="absolute right-3 top-3 flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs text-gray-500">Đang nghe...</span>
                </div>
              )}
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
              onClick={toggleVoiceRecognition}
              className={`h-8 px-3 text-xs ${
                isListening 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Mic className={`h-4 w-4 mr-1.5 ${isListening ? 'animate-pulse' : ''}`} />
              {isListening ? 'Đang nghe...' : 'Giọng nói'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
