'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Textarea
} from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Activity, 
  Shield, 
  Ban, 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Search,
  Filter,
  X,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserActivity {
  id: string
  user_id: string
  activity_type: string
  action: string
  details: any
  ip_address: string
  user_agent: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  profiles: {
    full_name: string
  } | null
}

interface SuspiciousActivity {
  id: string
  user_id: string
  activity_type: string
  description: string
  risk_score: number
  pattern_detected: string
  status: 'pending' | 'reviewed' | 'resolved' | 'false_positive'
  details: any
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  profiles: {
    id: string
    full_name: string
  } | null
  reviewed_by_profile: {
    id: string
    full_name: string
  } | null
}

interface BannedUser {
  id: string
  user_id: string
  reason: string
  ban_type: 'temporary' | 'permanent'
  banned_until: string | null
  notes: string | null
  created_at: string
  profiles: {
    email: string
    full_name: string
  } | null
  status: 'active' | 'expired' | 'permanent'
}

export function SystemManagement() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('activities')
  
  // Activities state
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activityFilters, setActivityFilters] = useState({
    activity_type: 'all',
    risk_level: 'all',
    user_id: ''
  })
  
  // Suspicious activities state
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([])
  const [suspiciousLoading, setSuspiciousLoading] = useState(false)
  
  // Banned users state
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [bannedUsersLoading, setBannedUsersLoading] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [banForm, setBanForm] = useState({
    reason: '',
    ban_type: 'temporary' as 'temporary' | 'permanent',
    duration_hours: 24,
    notes: ''
  })

  // Users list state
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchActivities()
    fetchSuspiciousActivities()
    fetchBannedUsers()
  }, [])

  useEffect(() => {
    if (banDialogOpen) {
      fetchUsers()
    }
  }, [banDialogOpen, userSearch])

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', session.user.id)
        .single()
      if (data) setCurrentUser(data)
    }
  }

  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true)
      const params = new URLSearchParams()
      if (activityFilters.activity_type) params.append('activity_type', activityFilters.activity_type)
      if (activityFilters.risk_level) params.append('risk_level', activityFilters.risk_level)
      if (activityFilters.user_id) params.append('user_id', activityFilters.user_id)
      params.append('limit', '100')

      const response = await fetch(`/api/system/user-activities?${params}`)
      const result = await response.json()

      if (result.success) {
        setActivities(result.activities || [])
      } else {
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải logs hoạt động',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải logs hoạt động: ' + error.message,
        variant: 'destructive'
      })
    } finally {
      setActivitiesLoading(false)
    }
  }

  const fetchSuspiciousActivities = async () => {
    try {
      setSuspiciousLoading(true)
      const response = await fetch('/api/system/suspicious-activities?limit=50')
      const result = await response.json()

      if (result.success) {
        setSuspiciousActivities(result.activities || [])
      } else {
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải hoạt động đáng nghi',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải hoạt động đáng nghi: ' + error.message,
        variant: 'destructive'
      })
    } finally {
      setSuspiciousLoading(false)
    }
  }

  const fetchBannedUsers = async () => {
    try {
      setBannedUsersLoading(true)
      const response = await fetch('/api/system/banned-users?include_expired=false')
      const result = await response.json()

      if (result.success) {
        setBannedUsers(result.banned_users || [])
      } else {
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải danh sách user bị ban',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách user bị ban: ' + error.message,
        variant: 'destructive'
      })
    } finally {
      setBannedUsersLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setUsersLoading(true)
      const params = new URLSearchParams()
      if (userSearch) {
        params.append('search', userSearch)
      }
      params.append('limit', '100')

      const response = await fetch(`/api/system/users?${params}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.users || [])
      } else {
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải danh sách users',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách users: ' + error.message,
        variant: 'destructive'
      })
    } finally {
      setUsersLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!selectedUser || !banForm.reason || !currentUser?.id) return

    try {
      const response = await fetch('/api/system/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          reason: banForm.reason,
          ban_type: banForm.ban_type,
          duration_hours: banForm.ban_type === 'temporary' ? banForm.duration_hours : null,
          banned_by: currentUser.id,
          notes: banForm.notes || null
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Thành công',
          description: result.message || 'Đã ban user thành công'
        })
        setBanDialogOpen(false)
        setBanForm({ reason: '', ban_type: 'temporary', duration_hours: 24, notes: '' })
        fetchBannedUsers()
      } else {
        throw new Error(result.error || 'Ban user thất bại')
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể ban user',
        variant: 'destructive'
      })
    }
  }

  const handleUnbanUser = async () => {
    if (!selectedUser || !currentUser?.id) return

    try {
      const response = await fetch(`/api/system/ban-user?user_id=${selectedUser}&unbanned_by=${currentUser.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Thành công',
          description: result.message || 'Đã unban user thành công'
        })
        setUnbanDialogOpen(false)
        fetchBannedUsers()
      } else {
        throw new Error(result.error || 'Unban user thất bại')
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể unban user',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateSuspiciousStatus = async (id: string, status: string) => {
    if (!currentUser?.id) return

    try {
      const response = await fetch('/api/system/suspicious-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          reviewed_by: currentUser.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật trạng thái'
        })
        fetchSuspiciousActivities()
      } else {
        throw new Error(result.error || 'Cập nhật thất bại')
      }
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật',
        variant: 'destructive'
      })
    }
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-orange-600 text-white'
      case 'medium': return 'bg-yellow-600 text-white'
      default: return 'bg-green-600 text-white'
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 50) return 'text-orange-600'
    if (score >= 30) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activities">
            <Activity className="h-4 w-4 mr-2" />
            Logs hoạt động
          </TabsTrigger>
          <TabsTrigger value="suspicious">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Hoạt động đáng nghi
          </TabsTrigger>
          <TabsTrigger value="banned">
            <Ban className="h-4 w-4 mr-2" />
            User bị ban
          </TabsTrigger>
        </TabsList>

        {/* Tab: User Activities */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Logs hoạt động người dùng</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchActivities}
                  disabled={activitiesLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${activitiesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Theo dõi tất cả hoạt động của người dùng trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Loại hoạt động</Label>
                  <Select
                    value={activityFilters.activity_type}
                    onValueChange={(value) => {
                      setActivityFilters({ ...activityFilters, activity_type: value === 'all' ? '' : value })
                      setTimeout(fetchActivities, 100)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="login">Đăng nhập</SelectItem>
                      <SelectItem value="logout">Đăng xuất</SelectItem>
                      <SelectItem value="query">Truy vấn</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="admin_action">Admin Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mức độ rủi ro</Label>
                  <Select
                    value={activityFilters.risk_level}
                    onValueChange={(value) => {
                      setActivityFilters({ ...activityFilters, risk_level: value === 'all' ? '' : value })
                      setTimeout(fetchActivities, 100)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>User ID</Label>
                  <Input
                    placeholder="Nhập user ID..."
                    value={activityFilters.user_id}
                    onChange={(e) => setActivityFilters({ ...activityFilters, user_id: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={fetchActivities}
                    className="w-full"
                    disabled={activitiesLoading}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Tìm kiếm
                  </Button>
                </div>
              </div>

              {/* Activities List */}
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                {activitiesLoading ? (
                  <div className="p-8 text-center">Đang tải...</div>
                ) : activities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Không có logs nào</div>
                ) : (
                  <div className="divide-y">
                    {activities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getRiskBadgeColor(activity.risk_level)}>
                                {activity.risk_level}
                              </Badge>
                              <Badge variant="outline">{activity.activity_type}</Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(activity.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="font-medium mb-1">{activity.action}</p>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <User className="h-3 w-3 inline mr-1" />
                                {activity.profiles?.full_name || activity.user_id}
                              </p>
                              {activity.ip_address && (
                                <p>IP: {activity.ip_address}</p>
                              )}
                              {activity.details && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-blue-600">Chi tiết</summary>
                                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                                    {JSON.stringify(activity.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Suspicious Activities */}
        <TabsContent value="suspicious" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Hoạt động đáng nghi</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSuspiciousActivities}
                  disabled={suspiciousLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${suspiciousLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Các hoạt động được phát hiện có dấu hiệu bất thường hoặc có tính phá hoại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                {suspiciousLoading ? (
                  <div className="p-8 text-center">Đang tải...</div>
                ) : suspiciousActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Không có hoạt động đáng nghi nào</div>
                ) : (
                  <div className="divide-y">
                    {suspiciousActivities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-lg font-bold ${getRiskScoreColor(activity.risk_score)}`}>
                                {activity.risk_score}
                              </span>
                              <Badge variant="outline">{activity.pattern_detected}</Badge>
                              <Badge>{activity.status}</Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(activity.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="font-medium mb-1">{activity.description}</p>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <User className="h-3 w-3 inline mr-1" />
                                {activity.profiles?.full_name || activity.user_id}
                              </p>
                                <p>Loại: {activity.activity_type}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {activity.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateSuspiciousStatus(activity.id, 'reviewed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Đã xem
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(activity.user_id)
                                    setBanDialogOpen(true)
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Ban
                                </Button>
                              </>
                            )}
                            {activity.status === 'reviewed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateSuspiciousStatus(activity.id, 'resolved')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Giải quyết
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Banned Users */}
        <TabsContent value="banned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Danh sách user bị ban</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchBannedUsers}
                    disabled={bannedUsersLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${bannedUsersLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Ban className="h-4 w-4 mr-2" />
                        Ban User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ban người dùng</DialogTitle>
                        <DialogDescription>
                          Nhập thông tin để ban người dùng khỏi hệ thống
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tìm kiếm user</Label>
                          <Input
                            placeholder="Tìm theo tên..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="mb-2"
                          />
                          <Label className="mt-2">Chọn user</Label>
                          <Select
                            value={selectedUser || ''}
                            onValueChange={(value) => setSelectedUser(value)}
                            disabled={usersLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={usersLoading ? "Đang tải..." : "Chọn user để ban"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {usersLoading && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  Đang tải...
                                </div>
                              )}
                              {!usersLoading && users.length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  Không tìm thấy user. Thử tìm kiếm khác.
                                </div>
                              )}
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex flex-col py-1">
                                    <span className="font-medium">{user.full_name || '(Không có tên)'}</span>
                                    {user.email && (
                                      <span className="text-xs text-gray-500">{user.email}</span>
                                    )}
                                    <span className="text-xs text-gray-400 truncate max-w-[200px]">{user.id}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedUser && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                              <strong>Đã chọn:</strong> {users.find(u => u.id === selectedUser)?.full_name || selectedUser}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label>Lý do ban *</Label>
                          <Textarea
                            placeholder="Nhập lý do ban user..."
                            value={banForm.reason}
                            onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Loại ban</Label>
                          <Select
                            value={banForm.ban_type}
                            onValueChange={(value: 'temporary' | 'permanent') => {
                              setBanForm({ ...banForm, ban_type: value })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="temporary">Tạm thời</SelectItem>
                              <SelectItem value="permanent">Vĩnh viễn</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {banForm.ban_type === 'temporary' && (
                          <div>
                            <Label>Thời gian ban (giờ)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={banForm.duration_hours}
                              onChange={(e) => setBanForm({ ...banForm, duration_hours: parseInt(e.target.value) || 24 })}
                            />
                          </div>
                        )}
                        <div>
                          <Label>Ghi chú</Label>
                          <Textarea
                            placeholder="Ghi chú thêm..."
                            value={banForm.notes}
                            onChange={(e) => setBanForm({ ...banForm, notes: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={handleBanUser}
                          disabled={!selectedUser || !banForm.reason}
                          className="w-full"
                        >
                          Ban User
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
              <CardDescription>
                Quản lý danh sách người dùng bị ban (tạm thời hoặc vĩnh viễn)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                {bannedUsersLoading ? (
                  <div className="p-8 text-center">Đang tải...</div>
                ) : bannedUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Không có user nào bị ban</div>
                ) : (
                  <div className="divide-y">
                    {bannedUsers.map((ban) => (
                      <div key={ban.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={ban.ban_type === 'permanent' ? 'destructive' : 'secondary'}>
                                {ban.ban_type === 'permanent' ? 'Vĩnh viễn' : 'Tạm thời'}
                              </Badge>
                              {ban.banned_until && (
                                <span className="text-sm text-gray-500">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  Đến: {new Date(ban.banned_until).toLocaleString('vi-VN')}
                                </span>
                              )}
                              <span className="text-sm text-gray-500">
                                Ban lúc: {new Date(ban.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="font-medium mb-1">
                              <User className="h-4 w-4 inline mr-1" />
                              {ban.profiles?.full_name || ban.user_id}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">Lý do: {ban.reason}</p>
                            {ban.notes && (
                              <p className="text-sm text-gray-500">Ghi chú: {ban.notes}</p>
                            )}
                          </div>
                          <div className="ml-4">
                            {ban.status !== 'expired' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(ban.user_id)
                                  setUnbanDialogOpen(true)
                                }}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Unban
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unban Dialog */}
      <AlertDialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận Unban User</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn unban user này? User sẽ có thể sử dụng hệ thống lại ngay lập tức.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnbanUser}>Xác nhận Unban</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

