'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogOut, Settings, FileText, User, Scale, Shield, Home, LogIn } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { getAvatarEmoji } from '@/lib/avatars'
import { LoginForm } from '@/components/auth/LoginForm'
import { useRouter } from 'next/navigation'

export function Header() {
  const { user, profile, signOut } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const router = useRouter()

  // Debug: Log profile để kiểm tra
  useEffect(() => {
    if (user) {
      console.log('Header - User:', user.id)
      console.log('Header - Profile:', profile)
      console.log('Header - Profile role:', profile?.role)
      console.log('Header - Is admin?', profile?.role === 'admin')
    }
  }, [user, profile])

  // Listen for custom event to open login modal
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setShowLoginModal(true)
    }

    window.addEventListener('openLoginModal', handleOpenLoginModal)
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal)
    }
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarDisplay = () => {
    if (!profile?.avatar_url) return null
    
    // Kiểm tra xem có phải emoji không
    if (profile.avatar_url.startsWith('emoji:')) {
      const emojiId = profile.avatar_url.replace('emoji:', '')
      return getAvatarEmoji(emojiId)
    }
    
    return null
  }

  const avatarEmoji = getAvatarDisplay()
  const avatarUrl = profile?.avatar_url && !profile.avatar_url.startsWith('emoji:') ? profile.avatar_url : ''

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Scale className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-gray-900">Legal Chatbot</span>
                  <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full">
                    AI
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Hỗ trợ pháp luật Việt Nam</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                Trang chủ
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
            </div>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-100 transition-colors">
                  {user ? (
                    avatarEmoji ? (
                      <div className="h-10 w-10 rounded-full border-2 border-blue-200 flex items-center justify-center bg-gray-50 shadow-sm">
                        <span className="text-xl">{avatarEmoji}</span>
                      </div>
                    ) : (
                      <Avatar className="h-10 w-10 border-2 border-blue-200 shadow-sm">
                        <AvatarImage src={avatarUrl} alt={profile?.full_name || ''} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                          {profile?.full_name 
                            ? getInitials(profile.full_name)
                            : user?.email?.charAt(0).toUpperCase() || 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                    )
                  ) : (
                    <div className="h-10 w-10 rounded-full border-2 border-blue-300 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm hover:shadow-md transition-shadow">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                {user ? (
                  <>
                    <div className="flex flex-col space-y-2 p-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {avatarEmoji ? (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gray-50">
                            <span className="text-xl">{avatarEmoji}</span>
                          </div>
                        ) : (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarUrl} alt={profile?.full_name || ''} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                              {profile?.full_name 
                                ? getInitials(profile.full_name)
                                : user?.email?.charAt(0).toUpperCase() || 'U'
                              }
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {profile?.full_name || 'Người dùng'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user?.email}
                          </p>
                          {profile?.role === 'admin' && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">Admin</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <DropdownMenuItem asChild>
                        <Link href="/" className="flex items-center space-x-2 cursor-pointer">
                          <Home className="h-4 w-4" />
                          <span>Trang chủ</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center space-x-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          <span>Thông tin cá nhân</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      {profile?.role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center space-x-2 cursor-pointer">
                            <Shield className="h-4 w-4" />
                            <span>Admin Panel</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem
                        onClick={async () => {
                          await signOut()
                          router.push('/login')
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Đăng xuất</span>
                      </DropdownMenuItem>
                    </div>
                  </>
                ) : (
                  <div className="p-1">
                    <div className="flex flex-col space-y-2 p-3 border-b border-gray-100 mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full border-2 border-blue-300 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Khách
                          </p>
                          <p className="text-xs text-gray-500">
                            Chưa đăng nhập
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <DropdownMenuItem asChild>
                        <Link href="/" className="flex items-center space-x-2 cursor-pointer">
                          <Home className="h-4 w-4 text-gray-600" />
                          <span>Trang chủ</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <button 
                          onClick={() => setShowLoginModal(true)}
                          className="flex items-center space-x-2 w-full cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded-sm transition-colors"
                        >
                          <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <LogIn className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-medium">Đăng nhập</span>
                        </button>
                      </DropdownMenuItem>
                    </div>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đăng nhập</DialogTitle>
            <DialogDescription>
              Đăng nhập để lưu lịch sử chat và truy cập các tính năng khác
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LoginForm 
              onSuccess={() => {
                setShowLoginModal(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
