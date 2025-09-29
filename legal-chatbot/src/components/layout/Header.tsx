'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { LogOut, Scale, Shield, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export function Header() {
  const { user, profile, signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { toast } = useToast()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      toast({
        title: 'Đăng xuất thành công',
        description: 'Bạn đã đăng xuất khỏi hệ thống',
      })
    } catch (error) {
      console.error('Sign out error:', error)
      toast({
        title: 'Lỗi đăng xuất',
        description: 'Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setIsSigningOut(false)
    }
  }

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
                  <Avatar className="h-10 w-10 border-2 border-blue-200">
                    <AvatarImage src="" alt={profile?.full_name || ''} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                      {profile?.full_name 
                        ? getInitials(profile.full_name)
                        : user?.email?.charAt(0).toUpperCase() || 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <div className="flex flex-col space-y-2 p-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={profile?.full_name || ''} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                        {profile?.full_name 
                          ? getInitials(profile.full_name)
                          : user?.email?.charAt(0).toUpperCase() || 'U'
                        }
                      </AvatarFallback>
                    </Avatar>
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
                  
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center space-x-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    disabled={isSigningOut || loading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isSigningOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    <span>{isSigningOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
