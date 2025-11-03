'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Save, User, Mail, Calendar, Check, Loader2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'
import { PRESET_AVATARS, getAvatarUrl, getPresetIdFromUrl, getAvatarEmoji, isEmojiAvatar } from '@/lib/avatars'

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [fullName, setFullName] = useState('')
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
    
    if (profile) {
      setFullName(profile.full_name || '')
      
      // Nếu có avatar_url, tìm preset ID tương ứng
      if (profile.avatar_url) {
        // Kiểm tra xem có phải emoji không
        if (profile.avatar_url.startsWith('emoji:')) {
          const emojiId = profile.avatar_url.replace('emoji:', '')
          setSelectedAvatarId(emojiId)
        } else {
          const presetId = getPresetIdFromUrl(profile.avatar_url)
          setSelectedAvatarId(presetId || 'blue')
        }
      } else {
        // Mặc định là blue nếu chưa có avatar
        setSelectedAvatarId('blue')
      }
    }
  }, [profile, authLoading, user, router])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId)
  }

  const getCurrentAvatarUrl = () => {
    if (!selectedAvatarId) return null
    const displayName = fullName.trim() || profile?.full_name || user?.email?.split('@')[0] || 'User'
    return getAvatarUrl(selectedAvatarId, displayName)
  }

  const getCurrentAvatarEmoji = () => {
    if (!selectedAvatarId) return null
    return getAvatarEmoji(selectedAvatarId)
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Tạo avatar URL hoặc emoji từ preset ID đã chọn
      let avatarUrl: string | null = null
      if (selectedAvatarId) {
        const emoji = getAvatarEmoji(selectedAvatarId)
        if (emoji) {
          // Nếu là emoji, lưu dạng "emoji:{emoji_id}" để dễ nhận biết
          avatarUrl = `emoji:${selectedAvatarId}`
        } else {
          const displayName = fullName.trim() || user?.email?.split('@')[0] || 'User'
          avatarUrl = getAvatarUrl(selectedAvatarId, displayName)
        }
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          avatar_url: avatarUrl
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      // Refresh profile in AuthProvider
      await refreshProfile()

      toast({
        title: 'Thành công',
        description: 'Đã cập nhật thông tin cá nhân'
      })
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật thông tin',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Thông tin cá nhân</CardTitle>
              <CardDescription>
                Quản lý thông tin tài khoản và ảnh đại diện của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-3">
                <div className="h-20 w-20 rounded-full border-2 border-blue-200 flex items-center justify-center overflow-hidden bg-gray-50">
                  {getCurrentAvatarEmoji() ? (
                    <span className="text-4xl">{getCurrentAvatarEmoji()}</span>
                  ) : (
                    <Avatar className="h-full w-full">
                      <AvatarImage 
                        src={getCurrentAvatarUrl() || ''} 
                        alt={profile.full_name || ''} 
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold">
                        {profile.full_name 
                          ? getInitials(profile.full_name)
                          : user.email?.charAt(0).toUpperCase() || 'U'
                        }
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                
                {/* Avatar Selection Grid */}
                <div className="w-full">
                  <Label className="text-xs font-medium mb-2 block text-gray-600">
                    Chọn ảnh đại diện
                  </Label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
                    {PRESET_AVATARS.map((avatar) => {
                      const displayName = fullName.trim() || profile?.full_name || user?.email?.split('@')[0] || 'User'
                      const avatarUrl = avatar.url(displayName)
                      const isSelected = selectedAvatarId === avatar.id
                      const isEmoji = avatar.type === 'emoji'
                      
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => handleAvatarSelect(avatar.id)}
                          className={`
                            relative aspect-square rounded-full overflow-hidden border transition-all bg-gray-50
                            ${isSelected 
                              ? 'border-2 border-blue-600 ring-1 ring-blue-300' 
                              : 'border border-gray-300 hover:border-blue-400'
                            }
                            ${isEmoji ? 'flex items-center justify-center' : ''}
                          `}
                          title={avatar.name}
                        >
                          {isEmoji ? (
                            <span className="text-lg">{avatar.emoji}</span>
                          ) : (
                            <img
                              src={avatarUrl || ''}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Email không thể thay đổi</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Họ và tên</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Ngày tham gia</span>
                  </Label>
                  <Input
                    value={new Date(profile.created_at).toLocaleDateString('vi-VN')}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={
                    isLoading || 
                    !fullName.trim() || 
                    (fullName === profile.full_name && selectedAvatarId === getPresetIdFromUrl(profile.avatar_url || ''))
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

