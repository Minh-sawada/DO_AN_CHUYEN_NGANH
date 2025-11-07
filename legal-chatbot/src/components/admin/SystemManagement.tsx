'use client'

import { useState, useEffect, useRef } from 'react'
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
  RefreshCw,
  Trash2,
  FileText
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
    role: string
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
    role?: string
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
  const [activeTab, setActiveTab] = useState('user-logs')
  
  // User Activities state
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesFetched, setActivitiesFetched] = useState(false) // Track xem đã fetch chưa
  const [groupedActivities, setGroupedActivities] = useState<Array<{
    key: string
    activities: UserActivity[]
    count: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    firstSeen: Date
    lastSeen: Date
    representative: UserActivity
  }>>([])
  const [activityFilters, setActivityFilters] = useState({
    activity_type: 'all',
    risk_level: 'all',
    user_id: ''
  })
  
  // Admin Activities state
  const [adminActivities, setAdminActivities] = useState<UserActivity[]>([])
  const [adminActivitiesLoading, setAdminActivitiesLoading] = useState(false)
  const [adminActivitiesFetched, setAdminActivitiesFetched] = useState(false)
  const [groupedAdminActivities, setGroupedAdminActivities] = useState<Array<{
    key: string
    activities: UserActivity[]
    count: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    firstSeen: Date
    lastSeen: Date
    representative: UserActivity
  }>>([])
  const [adminActivityFilters, setAdminActivityFilters] = useState({
    user_id: ''
  })
  
  // Suspicious activities state
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([])
  const [suspiciousLoading, setSuspiciousLoading] = useState(false)
  const [suspiciousFetched, setSuspiciousFetched] = useState(false) // Track xem đã fetch chưa
  const [groupedSuspiciousActivities, setGroupedSuspiciousActivities] = useState<Array<{
    key: string
    activities: SuspiciousActivity[]
    count: number
    riskScore: number
    firstSeen: Date
    lastSeen: Date
    representative: SuspiciousActivity
  }>>([])
  
  // Banned users state
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [bannedUsersLoading, setBannedUsersLoading] = useState(false)
  const [bannedUsersFetched, setBannedUsersFetched] = useState(false) // Track xem đã fetch chưa
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
  const initialFetchRef = useRef<boolean>(false) // Ref để tránh fetch nhiều lần trong Strict Mode

  useEffect(() => {
    // Fetch initial data - chỉ fetch 1 lần duy nhất (tránh Strict Mode double invoke)
    if (initialFetchRef.current) {
      console.log('⏭️ Skipping initial fetch - already fetched')
      return
    }
    
    const loadInitialData = async () => {
      initialFetchRef.current = true // Đánh dấu đã fetch
      await fetchCurrentUser()
      // Chỉ fetch user logs tab mặc định khi mount
      if (activeTab === 'user-logs') {
        await fetchActivities()
        setActivitiesFetched(true)
      }
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    // Chỉ fetch data khi tab active và chưa fetch và không đang loading
    if (activeTab === 'user-logs' && !activitiesFetched && !activitiesLoading) {
      fetchActivities().then(() => setActivitiesFetched(true))
    } else if (activeTab === 'admin-logs' && !adminActivitiesFetched && !adminActivitiesLoading) {
      fetchAdminActivities().then(() => setAdminActivitiesFetched(true))
    } else if (activeTab === 'suspicious' && !suspiciousFetched && !suspiciousLoading) {
      fetchSuspiciousActivities().then(() => setSuspiciousFetched(true))
    } else if (activeTab === 'banned' && !bannedUsersFetched) {
      fetchBannedUsers().then(() => setBannedUsersFetched(true))
    } else if (activeTab === 'users') {
      fetchUsers()
      // Đảm bảo fetch currentUser khi vào tab users
      if (!currentUser) {
        fetchCurrentUser()
      }
    }
  }, [activeTab, activitiesFetched, adminActivitiesFetched, suspiciousFetched, bannedUsersFetched, activitiesLoading, adminActivitiesLoading, suspiciousLoading])

  useEffect(() => {
    if (banDialogOpen) {
      fetchUsers()
    }
  }, [banDialogOpen, userSearch])

  // Group và analyze suspicious activities
  const groupAndAnalyzeSuspiciousActivities = (activities: SuspiciousActivity[]) => {
    const TIME_WINDOW_MS = 5 * 60 * 1000 // 5 phút
    const grouped = new Map<string, {
      key: string
      activities: SuspiciousActivity[]
      count: number
      riskScore: number
      firstSeen: Date
      lastSeen: Date
      representative: SuspiciousActivity
    }>()

    // Sort activities theo thời gian để xử lý tuần tự
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Group activities theo user_id + activity_type + pattern_detected + IP trong time window
    sortedActivities.forEach(activity => {
      const activityTime = new Date(activity.created_at)
      const key = `${activity.user_id}_${activity.activity_type}_${activity.pattern_detected}`
      
      const existingGroup = grouped.get(key)
      
      if (existingGroup) {
        // Đảm bảo cùng activity_type và pattern
        if (existingGroup.representative.activity_type !== activity.activity_type ||
            existingGroup.representative.pattern_detected !== activity.pattern_detected) {
          // Khác loại, tạo group mới
          grouped.set(key + '_' + activityTime.getTime(), {
            key: key + '_' + activityTime.getTime(),
            activities: [activity],
            count: 1,
            riskScore: activity.risk_score,
            firstSeen: activityTime,
            lastSeen: activityTime,
            representative: activity
          })
          return
        }
        
        const timeDiff = activityTime.getTime() - existingGroup.firstSeen.getTime()
        
        // Nếu trong time window, thêm vào group
        if (timeDiff <= TIME_WINDOW_MS && timeDiff >= 0) {
          existingGroup.activities.push(activity)
          existingGroup.count++
          existingGroup.lastSeen = activityTime > existingGroup.lastSeen ? activityTime : existingGroup.lastSeen
          existingGroup.representative = activity // Update representative với activity mới nhất
          
          // Update risk score (tăng dần theo count)
          existingGroup.riskScore = Math.max(
            existingGroup.riskScore,
            activity.risk_score + (existingGroup.count - 1) * 5 // Tăng 5 điểm mỗi lần lặp lại
          )
        } else {
          // Ngoài time window, tạo group mới
          grouped.set(key + '_' + activityTime.getTime(), {
            key: key + '_' + activityTime.getTime(),
            activities: [activity],
            count: 1,
            riskScore: activity.risk_score,
            firstSeen: activityTime,
            lastSeen: activityTime,
            representative: activity
          })
        }
      } else {
        // Tạo group mới
        grouped.set(key, {
          key,
          activities: [activity],
          count: 1,
          riskScore: activity.risk_score,
          firstSeen: activityTime,
          lastSeen: activityTime,
          representative: activity
        })
      }
    })

    // Convert map thành array và sort theo risk score và time
    const groupedArray = Array.from(grouped.values())
    
    // Sort: risk score cao nhất lên đầu, sau đó là time mới nhất
    groupedArray.sort((a, b) => {
      // Sort theo risk score
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
      
      // Nếu cùng risk score, sort theo count
      if (b.count !== a.count) return b.count - a.count
      
      // Nếu cùng count, sort theo time mới nhất
      return b.lastSeen.getTime() - a.lastSeen.getTime()
    })

    return groupedArray
  }

  const groupAndAnalyzeActivities = (activities: UserActivity[]) => {
    const TIME_WINDOW_MS = 5 * 60 * 1000 // 5 phút
    const grouped = new Map<string, {
      key: string
      activities: UserActivity[]
      count: number
      riskLevel: 'low' | 'medium' | 'high' | 'critical'
      firstSeen: Date
      lastSeen: Date
      representative: UserActivity // Activity đại diện (mới nhất)
    }>()

    // Sort activities theo thời gian để xử lý tuần tự
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Group activities theo user_id + activity_type + action + IP trong time window
    // QUAN TRỌNG: 
    // - admin_action: KHÔNG group, hiển thị riêng lẻ từng activity
    // - Các activity type khác: group như bình thường
    sortedActivities.forEach(activity => {
      const activityTime = new Date(activity.created_at)
      
      // Admin actions: KHÔNG group, mỗi activity là 1 group riêng
      if (activity.activity_type === 'admin_action') {
        const key = `admin_${activity.id}_${activityTime.getTime()}`
        grouped.set(key, {
          key,
          activities: [activity],
          count: 1, // Luôn là 1 cho admin actions
          riskLevel: activity.risk_level || 'low',
          firstSeen: activityTime,
          lastSeen: activityTime,
          representative: activity
        })
        return
      }
      
      // Các activity type khác: group như bình thường
      const key = `${activity.user_id}_${activity.activity_type}_${activity.action}_${activity.ip_address}`
      
      const existingGroup = grouped.get(key)
      
      if (existingGroup) {
        // Đảm bảo cùng activity_type
        if (existingGroup.representative.activity_type !== activity.activity_type) {
          // Khác activity_type, tạo group mới
          grouped.set(key + '_' + activityTime.getTime(), {
            key: key + '_' + activityTime.getTime(),
            activities: [activity],
            count: 1,
            riskLevel: activity.risk_level || 'low',
            firstSeen: activityTime,
            lastSeen: activityTime,
            representative: activity
          })
          return
        }
        
        const timeDiff = activityTime.getTime() - existingGroup.firstSeen.getTime()
        
        // Nếu trong time window, thêm vào group
        if (timeDiff <= TIME_WINDOW_MS && timeDiff >= 0) {
          existingGroup.activities.push(activity)
          existingGroup.count++
          existingGroup.lastSeen = activityTime > existingGroup.lastSeen ? activityTime : existingGroup.lastSeen
          existingGroup.representative = activity // Update representative với activity mới nhất
          
          // Update risk level dựa trên count
          if (existingGroup.count >= 20) {
            existingGroup.riskLevel = 'critical'
          } else if (existingGroup.count >= 10) {
            existingGroup.riskLevel = 'high'
          } else if (existingGroup.count >= 5) {
            existingGroup.riskLevel = 'medium'
          }
        } else {
          // Ngoài time window, tạo group mới với key khác
          grouped.set(key + '_' + activityTime.getTime(), {
            key: key + '_' + activityTime.getTime(),
            activities: [activity],
            count: 1,
            riskLevel: activity.risk_level || 'low',
            firstSeen: activityTime,
            lastSeen: activityTime,
            representative: activity
          })
        }
      } else {
        // Tạo group mới
        grouped.set(key, {
          key,
          activities: [activity],
          count: 1,
          riskLevel: activity.risk_level || 'low',
          firstSeen: activityTime,
          lastSeen: activityTime,
          representative: activity
        })
      }
    })

    // Convert map thành array và sort theo risk level và time
    const groupedArray = Array.from(grouped.values())
    
    // Sort: risk cao nhất lên đầu, sau đó là time mới nhất
    groupedArray.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const riskDiff = riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
      if (riskDiff !== 0) return riskDiff
      
      // Nếu cùng risk, sort theo time mới nhất
      return b.lastSeen.getTime() - a.lastSeen.getTime()
    })

    return groupedArray
  }

  const formatActivityDetails = (details: any) => {
    if (!details || typeof details !== 'object') {
      return null
    }

    // Format các field phổ biến
    const formattedFields: React.ReactElement[] = []
    
    // Timestamp
    if (details.timestamp) {
      formattedFields.push(
        <div key="timestamp" className="flex items-center space-x-2 py-1">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            <span className="font-medium text-gray-700">Thời gian:</span>{' '}
            {new Date(details.timestamp).toLocaleString('vi-VN')}
          </span>
        </div>
      )
    }

    // Event
    if (details.event) {
      formattedFields.push(
        <div key="event" className="flex items-center space-x-2 py-1">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            <span className="font-medium text-gray-700">Sự kiện:</span>{' '}
            <Badge variant="outline" className="ml-1">{details.event}</Badge>
          </span>
        </div>
      )
    }

    // File name (cho upload)
    if (details.fileName) {
      formattedFields.push(
        <div key="fileName" className="flex items-center space-x-2 py-1">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            <span className="font-medium text-gray-700">Tên file:</span>{' '}
            <span className="text-blue-600">{details.fileName}</span>
          </span>
        </div>
      )
    }

    // File size
    if (details.fileSize) {
      const sizeMB = (details.fileSize / 1024 / 1024).toFixed(2)
      formattedFields.push(
        <div key="fileSize" className="flex items-center space-x-2 py-1">
          <span className="text-sm">
            <span className="font-medium text-gray-700">Kích thước:</span>{' '}
            {sizeMB} MB
          </span>
        </div>
      )
    }

    // Query (cho chat)
    if (details.query) {
      formattedFields.push(
        <div key="query" className="py-1">
          <span className="text-sm font-medium text-gray-700">Câu hỏi:</span>
          <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded border-l-2 border-blue-400">
            {details.query}
          </p>
        </div>
      )
    }

    // Sources count
    if (details.sourcesCount !== undefined) {
      formattedFields.push(
        <div key="sourcesCount" className="flex items-center space-x-2 py-1">
          <span className="text-sm">
            <span className="font-medium text-gray-700">Số nguồn:</span>{' '}
            <Badge variant="secondary">{details.sourcesCount}</Badge>
          </span>
        </div>
      )
    }

    // Chunks processed
    if (details.chunksProcessed !== undefined) {
      formattedFields.push(
        <div key="chunksProcessed" className="flex items-center space-x-2 py-1">
          <span className="text-sm">
            <span className="font-medium text-gray-700">Số chunks:</span>{' '}
            <Badge variant="secondary">{details.chunksProcessed}</Badge>
          </span>
        </div>
      )
    }

    // Title
    if (details.title) {
      formattedFields.push(
        <div key="title" className="py-1">
          <span className="text-sm font-medium text-gray-700">Tiêu đề:</span>
          <p className="text-sm text-gray-600 mt-1">{details.title}</p>
        </div>
      )
    }

    // Deleted user info (cho admin actions)
    if (details.deleted_user_id) {
      formattedFields.push(
        <div key="deleted_user" className="py-1">
          <span className="text-sm font-medium text-red-700">Đã xóa user:</span>
          <p className="text-sm text-gray-600 mt-1 font-mono">{details.deleted_user_id}</p>
        </div>
      )
    }

    // Total, inserted, failed (cho upload laws)
    if (details.total !== undefined || details.inserted !== undefined || details.failed !== undefined) {
      formattedFields.push(
        <div key="upload_stats" className="py-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Thống kê Upload:</span>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {details.total !== undefined && (
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">Tổng</div>
                <div className="text-lg font-bold text-blue-600">{details.total}</div>
              </div>
            )}
            {details.inserted !== undefined && (
              <div className="bg-green-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">Thành công</div>
                <div className="text-lg font-bold text-green-600">{details.inserted}</div>
              </div>
            )}
            {details.failed !== undefined && (
              <div className="bg-red-50 p-2 rounded text-center">
                <div className="text-xs text-gray-600">Thất bại</div>
                <div className="text-lg font-bold text-red-600">{details.failed}</div>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Text length (cho upload word)
    if (details.textLength) {
      const lengthKB = (details.textLength / 1024).toFixed(2)
      formattedFields.push(
        <div key="textLength" className="flex items-center space-x-2 py-1">
          <span className="text-sm">
            <span className="font-medium text-gray-700">Độ dài văn bản:</span>{' '}
            {lengthKB} KB ({details.textLength.toLocaleString()} ký tự)
          </span>
        </div>
      )
    }

    // Law ID (cho upload word)
    if (details.lawId) {
      formattedFields.push(
        <div key="lawId" className="flex items-center space-x-2 py-1">
          <span className="text-sm">
            <span className="font-medium text-gray-700">ID Văn bản:</span>{' '}
            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{details.lawId}</code>
          </span>
        </div>
      )
    }

    // Target user ID (cho admin actions) - Hiển thị TRƯỚC role change
    if (details.target_user_id) {
      formattedFields.push(
        <div key="target_user" className="py-1">
          <span className="text-sm font-medium text-gray-700">User mục tiêu:</span>
          <div className="flex items-center space-x-2 mt-1 flex-wrap">
            {details.target_user_name && (
              <span className="text-sm text-gray-900 font-medium">{details.target_user_name}</span>
            )}
            <span className="text-sm text-gray-500">({details.target_user_id})</span>
          </div>
        </div>
      )
    }

    // Old role, new role (cho update profile) - Hiển thị SAU target user
    // Chỉ hiển thị role mới, không hiển thị role cũ
    if (details.new_role) {
      formattedFields.push(
        <div key="role_change" className="py-1">
          <span className="text-sm font-medium text-gray-700">Thay đổi Role:</span>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">{details.new_role}</Badge>
          </div>
        </div>
      )
    }

    // Các field khác không được format đặc biệt
    const otherFields = Object.keys(details).filter(key => 
      !['timestamp', 'event', 'fileName', 'fileSize', 'query', 'sourcesCount', 
        'chunksProcessed', 'title', 'deleted_user_id', 'updated_fields', 'total',
        'inserted', 'failed', 'textLength', 'lawId', 'old_role', 'new_role', 'target_user_id'].includes(key)
    )

    if (otherFields.length > 0) {
      formattedFields.push(
        <div key="other" className="mt-2 pt-2 border-t">
          <span className="text-sm font-medium text-gray-700">Thông tin khác:</span>
          <div className="mt-1 space-y-1">
            {otherFields.map((key) => (
              <div key={key} className="text-xs text-gray-600">
                <span className="font-medium">{key}:</span>{' '}
                {typeof details[key] === 'object' 
                  ? JSON.stringify(details[key], null, 2)
                  : String(details[key])}
              </div>
            ))}
          </div>
        </div>
      )
    }

    return formattedFields.length > 0 ? formattedFields : null
  }

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
    // Nếu đang loading, không fetch lại (tránh rate limit)
    if (activitiesLoading) {
      console.log('⏭️ Skipping fetch - already loading')
      return
    }
    
    try {
      setActivitiesLoading(true)
      console.log('📥 Fetching activities with filters:', activityFilters)
      console.log('📥 Filter activity_type:', activityFilters.activity_type)
      
      const params = new URLSearchParams()
      // KHÔNG filter theo activity_type ở API level để lấy tất cả activities
      // Sẽ filter ở client side để có thể kiểm tra role
      if (activityFilters.risk_level && activityFilters.risk_level !== 'all') {
        params.append('risk_level', activityFilters.risk_level)
      }
      if (activityFilters.user_id) {
        params.append('user_id', activityFilters.user_id)
      }
      params.append('limit', '1000') // Tăng limit lên 1000

      console.log('📥 API URL:', `/api/system/user-activities?${params}`)
      const response = await fetch(`/api/system/user-activities?${params}`)
      
      // Xử lý response có thể là plain text hoặc JSON
      let result: any
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // Plain text response (e.g., "Rate limit exceeded")
        const text = await response.text()
        result = { success: false, error: text || 'Unknown error' }
      }

      console.log('📥 API Response:', result)

      if (result.success) {
        console.log('✅ Activities loaded:', result.activities?.length || 0)
        // Debug: Log activity types trong kết quả
        if (result.activities && result.activities.length > 0) {
          const activityTypes = [...new Set(result.activities.map((a: any) => a.activity_type))]
          console.log('📊 Activity types in result:', activityTypes)
          console.log('📊 Filter was:', activityFilters.activity_type)
        }
        
        // Filter activities - CHỈ hiển thị activities của user thường (role = 'user' hoặc không có role)
        let filteredActivities = result.activities || []
        
        // Debug: Log roles trong activities
        if (filteredActivities.length > 0) {
          const roles = filteredActivities.map((a: UserActivity) => a.profiles?.role || 'no-role')
          const roleCounts = roles.reduce((acc: any, role: string) => {
            acc[role] = (acc[role] || 0) + 1
            return acc
          }, {})
          console.log('📊 Role distribution in activities:', roleCounts)
        }
        
        // Bước 1: Chỉ giữ lại activities của user thường (role = 'user' hoặc null/undefined)
        filteredActivities = filteredActivities.filter((a: UserActivity) => {
          const role = a.profiles?.role
          // Chỉ giữ lại nếu: không có role, role là 'user', hoặc không phải admin/editor
          return !role || role === 'user' || (role !== 'admin' && role !== 'editor')
        })
        
        // Bước 2: Filter theo activity_type nếu có filter
        if (activityFilters.activity_type && activityFilters.activity_type !== 'all') {
          filteredActivities = filteredActivities.filter((a: UserActivity) => 
            a.activity_type === activityFilters.activity_type
          )
      } else {
          // Nếu chọn "Tất cả", loại bỏ admin_action
          filteredActivities = filteredActivities.filter((a: UserActivity) => 
            a.activity_type !== 'admin_action'
          )
        }
        
        console.log('📊 Filtered activities:', filteredActivities.length, 'after filtering by', activityFilters.activity_type)
        
        // Group và analyze activities (chỉ group activities đã được filter)
        const grouped = groupAndAnalyzeActivities(filteredActivities)
        console.log('📊 Grouped activities:', grouped.length, 'groups')
        setActivities(filteredActivities)
        setGroupedActivities(grouped)
      } else {
        console.error('❌ Error loading activities:', result.error)
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải logs hoạt động',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('❌ Error fetching activities:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải logs hoạt động: ' + error.message,
        variant: 'destructive'
      })
    } finally {
      setActivitiesLoading(false)
    }
  }

  const fetchAdminActivities = async () => {
    // Nếu đang loading, không fetch lại
    if (adminActivitiesLoading) {
      console.log('⏭️ Skipping fetch admin - already loading')
      return
    }
    
    try {
      setAdminActivitiesLoading(true)
      console.log('📥 Fetching admin activities with filters:', adminActivityFilters)
      
      const params = new URLSearchParams()
      params.append('activity_type', 'admin_action') // Chỉ lấy admin actions
      if (adminActivityFilters.user_id) {
        params.append('user_id', adminActivityFilters.user_id)
      }
      params.append('limit', '1000') // Tăng limit lên 1000

      console.log('📥 API URL:', `/api/system/user-activities?${params}`)
      const response = await fetch(`/api/system/user-activities?${params}`)
      
      // Xử lý response có thể là plain text hoặc JSON
      let result: any
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // Plain text response (e.g., "Rate limit exceeded")
        const text = await response.text()
        result = { success: false, error: text || 'Unknown error' }
      }

      console.log('📥 API Response:', result)

      if (result.success) {
        console.log('✅ Admin activities loaded:', result.activities?.length || 0)
        
        // Filter theo user_id nếu có
        let filteredActivities = result.activities || []
        if (adminActivityFilters.user_id) {
          filteredActivities = filteredActivities.filter((a: UserActivity) => 
            a.user_id === adminActivityFilters.user_id
          )
        }
        
        // Chỉ hiển thị activities của admin và editor
        filteredActivities = filteredActivities.filter((a: UserActivity) => 
          a.profiles?.role === 'admin' || a.profiles?.role === 'editor'
        )
        
        // Group và analyze admin activities (không group admin actions)
        const grouped = groupAndAnalyzeActivities(filteredActivities)
        console.log('📊 Grouped admin activities:', grouped.length, 'groups')
        setAdminActivities(filteredActivities)
        setGroupedAdminActivities(grouped)
      } else {
        console.error('❌ Error loading admin activities:', result.error)
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải logs admin',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('❌ Error fetching admin activities:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể tải logs admin: ' + error.message,
        variant: 'destructive'
      })
    } finally {
      setAdminActivitiesLoading(false)
    }
  }

  const fetchSuspiciousActivities = async () => {
    // Nếu đang loading, không fetch lại
    if (suspiciousLoading) {
      console.log('⏭️ Skipping fetch suspicious - already loading')
      return
    }
    
    try {
      setSuspiciousLoading(true)
      const response = await fetch('/api/system/suspicious-activities?limit=1000') // Tăng limit lên 1000
      
      // Xử lý response có thể là plain text hoặc JSON
      let result: any
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // Plain text response (e.g., "Rate limit exceeded")
        const text = await response.text()
        result = { success: false, error: text || 'Unknown error' }
      }

      if (result.success) {
        console.log('✅ Suspicious activities loaded:', result.activities?.length || 0)
        
        // Filter - CHỈ hiển thị activities của user thường (role = 'user' hoặc không có role)
        let filteredActivities = result.activities || []
        filteredActivities = filteredActivities.filter((a: SuspiciousActivity) => {
          const role = a.profiles?.role
          // Chỉ giữ lại nếu: không có role, role là 'user', hoặc không phải admin/editor
          return !role || role === 'user' || (role !== 'admin' && role !== 'editor')
        })
        
        console.log('📊 Filtered suspicious activities:', filteredActivities.length, 'after filtering by role')
        
        // Group và analyze suspicious activities (chỉ group activities đã được filter)
        const grouped = groupAndAnalyzeSuspiciousActivities(filteredActivities)
        console.log('📊 Grouped suspicious activities:', grouped.length, 'groups')
        setSuspiciousActivities(filteredActivities)
        setGroupedSuspiciousActivities(grouped)
      } else {
        console.error('❌ Error loading suspicious activities:', result.error)
        toast({
          title: 'Lỗi',
          description: result.error || 'Không thể tải hoạt động đáng nghi',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('❌ Error fetching suspicious activities:', error)
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
      params.append('limit', '1000') // Tăng limit lên 1000

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="user-logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs người dùng
          </TabsTrigger>
          <TabsTrigger value="admin-logs">
            <Shield className="h-4 w-4 mr-2" />
            Nhật ký Hệ thống
          </TabsTrigger>
          <TabsTrigger value="suspicious">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Hoạt động đáng nghi
          </TabsTrigger>
          <TabsTrigger value="banned">
            <Ban className="h-4 w-4 mr-2" />
            User bị ban
          </TabsTrigger>
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            Quản lý người dùng
          </TabsTrigger>
        </TabsList>

        {/* Tab: User Activities */}
        <TabsContent value="user-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                 <span>Logs người dùng</span>
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
                 Theo dõi hoạt động của người dùng: đăng nhập, đăng xuất, truy vấn...
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
                      setActivityFilters({ ...activityFilters, activity_type: value })
                      // Chỉ fetch nếu không đang loading
                      if (!activitiesLoading) {
                        fetchActivities()
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="logout">🔐 Đăng nhập</SelectItem>
                      <SelectItem value="login">🚪 Đăng xuất</SelectItem>
                      <SelectItem value="query">💬 Truy vấn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mức độ rủi ro</Label>
                  <Select
                    value={activityFilters.risk_level}
                    onValueChange={(value) => {
                      setActivityFilters({ ...activityFilters, risk_level: value })
                      // Chỉ fetch nếu không đang loading
                      if (!activitiesLoading) {
                        fetchActivities()
                      }
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
                    {groupedActivities.map((group, index) => {
                      const activity = group.representative
                      return (
                        <div key={`${group.key}_${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className={getRiskBadgeColor(group.riskLevel)}>
                                  {group.riskLevel}
                              </Badge>
                                {group.count > 1 && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                    {group.count} lần
                                  </Badge>
                                )}
                                <Badge variant="outline" className="capitalize">
                                  {activity.activity_type === 'login' && '🔐 Đăng nhập'}
                                  {activity.activity_type === 'logout' && '🚪 Đăng xuất'}
                                  {activity.activity_type === 'query' && '💬 Truy vấn'}
                                  {activity.activity_type === 'upload' && '📤 Upload'}
                                  {activity.activity_type === 'admin_action' && '🛡️ Admin'}
                                  {!['login', 'logout', 'query', 'upload', 'admin_action'].includes(activity.activity_type) && activity.activity_type}
                                </Badge>
                                <span className="text-sm text-gray-500 flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {group.count > 1 
                                      ? `${new Date(group.firstSeen).toLocaleString('vi-VN')} - ${new Date(group.lastSeen).toLocaleString('vi-VN')}`
                                      : new Date(activity.created_at).toLocaleString('vi-VN')
                                    }
                                  </span>
                              </span>
                            </div>
                              <p className="font-medium mb-2 text-gray-900">
                                {activity.action}
                                {group.count > 1 && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    (Lặp lại {group.count} lần trong {Math.round((group.lastSeen.getTime() - group.firstSeen.getTime()) / 1000 / 60)} phút)
                                  </span>
                                )}
                              </p>
                              <div className="text-sm text-gray-600 space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-700">Người thực hiện:</span>
                                  <span>{activity.profiles?.full_name || activity.user_id}</span>
                                  {activity.profiles?.role && (
                                    <Badge variant="outline" className="ml-2 capitalize">
                                      {activity.profiles.role === 'admin' && '🛡️ Admin'}
                                      {activity.profiles.role === 'editor' && '✏️ Editor'}
                                      {activity.profiles.role === 'user' && '👤 User'}
                                      {!['admin', 'editor', 'user'].includes(activity.profiles.role) && activity.profiles.role}
                                    </Badge>
                                  )}
                                </div>
                              {activity.ip_address && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-700">IP:</span>
                                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{activity.ip_address}</code>
                                  </div>
                              )}
                              {activity.details && (
                                  <details className="mt-3">
                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1 transition-colors">
                                      <Eye className="h-4 w-4 inline" />
                                      <span>Chi tiết</span>
                                    </summary>
                                    <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                      {formatActivityDetails(activity.details) || (
                                        <div className="text-sm text-gray-600">
                                          <pre className="text-xs bg-white p-3 rounded border overflow-auto font-mono">
                                    {JSON.stringify(activity.details, null, 2)}
                                  </pre>
                                        </div>
                                      )}
                                    </div>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Admin Activities */}
        <TabsContent value="admin-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                 <span>Nhật ký Hệ thống</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAdminActivities}
                  disabled={adminActivitiesLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${adminActivitiesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                 Theo dõi hoạt động của admin và editor: chỉnh sửa, upload, ban user, thay đổi role...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>User ID</Label>
                  <Input
                    placeholder="Nhập user ID..."
                    value={adminActivityFilters.user_id}
                    onChange={(e) => setAdminActivityFilters({ ...adminActivityFilters, user_id: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={fetchAdminActivities}
                    className="w-full"
                    disabled={adminActivitiesLoading}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Tìm kiếm
                  </Button>
                </div>
              </div>

              {/* Admin Activities List */}
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                {adminActivitiesLoading ? (
                  <div className="p-8 text-center">Đang tải...</div>
                ) : adminActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Không có logs admin nào</div>
                ) : (
                  <div className="divide-y">
                    {groupedAdminActivities.map((group, index) => {
                      const activity = group.representative
                      return (
                        <div key={`${group.key}_${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="capitalize">
                                  🛡️ Admin Action
                                </Badge>
                                <span className="text-sm text-gray-500 flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                {new Date(activity.created_at).toLocaleString('vi-VN')}
                                  </span>
                              </span>
                            </div>
                              <p className="font-medium mb-2 text-gray-900">
                                {activity.action}
                              </p>
                              <div className="text-sm text-gray-600 space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-700">Người thực hiện:</span>
                                  <span>{activity.profiles?.full_name || activity.user_id}</span>
                                </div>
                              {activity.ip_address && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-700">IP:</span>
                                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{activity.ip_address}</code>
                                  </div>
                              )}
                              {activity.details && (
                                  <details className="mt-3">
                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1 transition-colors">
                                      <Eye className="h-4 w-4 inline" />
                                      <span>Chi tiết</span>
                                    </summary>
                                    <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                      {formatActivityDetails(activity.details) || (
                                        <div className="text-sm text-gray-600">
                                          <pre className="text-xs bg-white p-3 rounded border overflow-auto font-mono">
                                    {JSON.stringify(activity.details, null, 2)}
                                  </pre>
                                        </div>
                                      )}
                                    </div>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      )
                    })}
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
                ) : groupedSuspiciousActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Không có hoạt động đáng nghi nào</div>
                ) : (
                  <div className="divide-y">
                    {groupedSuspiciousActivities.map((group, index) => {
                      const activity = group.representative
                      return (
                        <div key={`${group.key}_${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <div className="flex items-center space-x-2">
                                  <span className={`text-lg font-bold ${getRiskScoreColor(group.riskScore)}`}>
                                    {group.riskScore}
                              </span>
                                  {group.count > 1 && (
                                    <span className="text-xs text-gray-500">
                                      (Ban đầu: {group.activities[0]?.risk_score || group.riskScore})
                                    </span>
                                  )}
                                </div>
                                {group.count > 1 && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                    {group.count} lần
                                  </Badge>
                                )}
                              <Badge variant="outline">{activity.pattern_detected}</Badge>
                              <Badge>{activity.status}</Badge>
                                <span className="text-sm text-gray-500 flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {group.count > 1 
                                      ? `${new Date(group.firstSeen).toLocaleString('vi-VN')} - ${new Date(group.lastSeen).toLocaleString('vi-VN')}`
                                      : new Date(activity.created_at).toLocaleString('vi-VN')
                                    }
                                  </span>
                              </span>
                            </div>
                              <p className="font-medium mb-2 text-gray-900">
                                {activity.description}
                                {group.count > 1 && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    (Lặp lại {group.count} lần trong {Math.round((group.lastSeen.getTime() - group.firstSeen.getTime()) / 1000 / 60)} phút)
                                  </span>
                                )}
                              </p>
                              <div className="text-sm text-gray-600 space-y-1.5">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-700">Người dùng:</span>
                                  <span>{activity.profiles?.full_name || activity.user_id}</span>
                                </div>
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
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Users Management */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quản lý người dùng</span>
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <Badge className={currentUser.role === 'admin' ? 'bg-red-600 text-white' : currentUser.role === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}>
                      Bạn: {currentUser.role === 'admin' ? 'Quản trị viên' : currentUser.role === 'editor' ? 'Biên tập viên' : 'Người dùng'}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    disabled={usersLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Quản lý vai trò và quyền của người dùng trong hệ thống. 
                {currentUser?.role === 'admin' && ' Bạn có thể xóa user có quyền thấp hơn (Editor, User).'}
                {(!currentUser || currentUser.role !== 'admin') && ' Chỉ Admin mới có thể xóa user.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Tìm kiếm theo tên..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      fetchUsers()
                    }}
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                {usersLoading ? (
                  <div className="p-8 text-center">Đang tải...</div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Không có user nào</div>
                ) : (
                  <div className="divide-y">
                    {users.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={(() => {
                                if (user.role === 'admin') return 'bg-red-600 text-white'
                                if (user.role === 'editor') return 'bg-blue-600 text-white'
                                return 'bg-gray-600 text-white'
                              })()}>
                                {user.role === 'admin' ? 'Quản trị viên' : 
                                 user.role === 'editor' ? 'Biên tập viên' : 'Người dùng'}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(user.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="font-medium mb-1">
                              <User className="h-4 w-4 inline mr-1" />
                              {user.full_name || '(Không có tên)'}
                            </p>
                            <div className="text-sm text-gray-600 space-y-1">
                              {user.email && (
                                <p>Email: {user.email}</p>
                              )}
                              <p className="text-xs text-gray-400 truncate max-w-[400px]">ID: {user.id}</p>
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-2">
                            <Select
                              value={user.role || 'user'}
                              onValueChange={async (newRole) => {
                                try {
                                  // Kiểm tra và refresh session trước
                                  let { data: { session }, error: sessionError } = await supabase.auth.getSession()
                                  
                                  // Nếu không có session, thử refresh
                                  if (!session) {
                                    console.log('No session found, trying to refresh...')
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (user) {
                                      // User vẫn tồn tại, refresh session
                                      const { data: { session: newSession } } = await supabase.auth.refreshSession()
                                      session = newSession
                                    }
                                  }
                                  
                                  if (sessionError) {
                                    console.error('Session error:', sessionError)
                                    toast({
                                      title: 'Lỗi',
                                      description: 'Lỗi xác thực. Vui lòng đăng nhập lại.',
                                      variant: 'destructive'
                                    })
                                    return
                                  }

                                  if (!session) {
                                    toast({
                                      title: 'Lỗi',
                                      description: 'Bạn chưa đăng nhập. Vui lòng đăng nhập lại.',
                                      variant: 'destructive'
                                    })
                                    return
                                  }

                                  console.log('Sending request with session:', {
                                    hasSession: !!session,
                                    userId: session.user.id,
                                    expiresAt: session.expires_at,
                                    accessToken: session.access_token ? 'present' : 'missing',
                                    accessTokenLength: session.access_token?.length || 0
                                  })

                                  // Gửi cả cookies và Authorization header để đảm bảo
                                  const headers: HeadersInit = {
                                    'Content-Type': 'application/json'
                                  }
                                  
                                  // Thêm Authorization header nếu có access token
                                  if (session.access_token) {
                                    headers['Authorization'] = `Bearer ${session.access_token}`
                                    console.log('Added Authorization header, token length:', session.access_token.length)
                                  } else {
                                    console.warn('⚠️ No access_token in session! Cannot send Authorization header.')
                                  }

                                  const response = await fetch('/api/admin/update-profile', {
                                    method: 'POST',
                                    headers,
                                    credentials: 'include', // Quan trọng: gửi cookies
                                    body: JSON.stringify({
                                      userId: user.id,
                                      role: newRole,
                                      fullName: user.full_name
                                    })
                                  })
                                  
                                  console.log('Response status:', response.status, response.statusText)

                                  if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}))
                                    console.error('API Error:', errorData)
                                    
                                    // Nếu là lỗi role không được hỗ trợ
                                    if (errorData.code === 'ROLE_NOT_SUPPORTED') {
                                      toast({
                                        title: 'Lỗi: Role không được hỗ trợ',
                                        description: errorData.error || 'Database chưa hỗ trợ role này. Vui lòng chạy SQL migration.',
                                        variant: 'destructive',
                                        duration: 10000 // Hiển thị lâu hơn
                                      })
                                      throw new Error(errorData.error || 'Role không được hỗ trợ')
                                    }
                                    
                                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
                                  }

                                  const result = await response.json()

                                  if (result.success) {
                                    toast({
                                      title: 'Thành công',
                                      description: `Đã cập nhật vai trò thành ${newRole === 'admin' ? 'Quản trị viên' : newRole === 'editor' ? 'Biên tập viên' : 'Người dùng'}`
                                    })
                                    fetchUsers()
                                  } else {
                                    throw new Error(result.error || 'Cập nhật thất bại')
                                  }
                                } catch (error: any) {
                                  console.error('Error updating role:', error)
                                  
                                  // Hiển thị error message chi tiết hơn
                                  let errorMessage = error.message || 'Không thể cập nhật vai trò'
                                  
                                  // Nếu là lỗi về role không hỗ trợ
                                  if (error.message && error.message.includes('Role') && error.message.includes('không được hỗ trợ')) {
                                    errorMessage = error.message + '\n\nVui lòng chạy file: database/add-editor-role-recommended.sql trong Supabase SQL Editor'
                                  }
                                  
                                  toast({
                                    title: 'Lỗi',
                                    description: errorMessage,
                                    variant: 'destructive',
                                    duration: 10000
                                  })
                                }
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Người dùng</SelectItem>
                                <SelectItem value="editor">Biên tập viên</SelectItem>
                                <SelectItem value="admin">Quản trị viên</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Nút xóa user - chỉ admin mới thấy và chỉ xóa được user có quyền thấp hơn */}
                            {(() => {
                              // Debug: log để kiểm tra
                              console.log('Checking delete button for user:', {
                                currentUserRole: currentUser?.role,
                                currentUserId: currentUser?.id,
                                targetUserRole: user.role,
                                targetUserId: user.id,
                                isAdmin: currentUser?.role === 'admin',
                                isSameUser: user.id === currentUser?.id
                              })
                              
                              // Chỉ admin mới thấy nút
                              if (!currentUser || currentUser.role !== 'admin') {
                                console.log('❌ Not showing delete button: not admin')
                                return null
                              }
                              
                              // Không cho xóa chính mình
                              if (user.id === currentUser.id) {
                                console.log('❌ Not showing delete button: same user')
                                return null
                              }
                              
                              // Tính level quyền: admin=3, editor=2, user=1
                              const currentLevel = currentUser.role === 'admin' ? 3 : currentUser.role === 'editor' ? 2 : 1
                              const targetLevel = user.role === 'admin' ? 3 : user.role === 'editor' ? 2 : 1
                              
                              // Chỉ xóa được user có quyền thấp hơn
                              if (currentLevel <= targetLevel) {
                                console.log('❌ Not showing delete button: target level too high', { currentLevel, targetLevel })
                                return null
                              }
                              
                              console.log('✅ Showing delete button')
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    if (!confirm(`⚠️ Bạn có chắc chắn muốn XÓA user "${user.full_name || user.email || user.id}"?\n\nHành động này KHÔNG THỂ hoàn tác!`)) {
                                      return
                                    }

                                    try {
                                      const { data: { session } } = await supabase.auth.getSession()
                                      if (!session) {
                                        toast({
                                          title: 'Lỗi',
                                          description: 'Bạn cần đăng nhập',
                                          variant: 'destructive'
                                        })
                                        return
                                      }

                                      const headers: HeadersInit = {
                                        'Content-Type': 'application/json'
                                      }
                                      
                                      if (session.access_token) {
                                        headers['Authorization'] = `Bearer ${session.access_token}`
                                      }

                                      const response = await fetch(`/api/admin/delete-user?userId=${user.id}`, {
                                        method: 'DELETE',
                                        headers,
                                        credentials: 'include'
                                      })

                                      if (!response.ok) {
                                        const errorData = await response.json().catch(() => ({}))
                                        throw new Error(errorData.error || `HTTP ${response.status}`)
                                      }

                                      const result = await response.json()

                                      if (result.success) {
                                        toast({
                                          title: '✅ Thành công',
                                          description: result.message || 'Đã xóa user thành công'
                                        })
                                        fetchUsers()
                                      } else {
                                        throw new Error(result.error || 'Xóa user thất bại')
                                      }
                                    } catch (error: any) {
                                      console.error('Error deleting user:', error)
                                      toast({
                                        title: '❌ Lỗi',
                                        description: error.message || 'Không thể xóa user',
                                        variant: 'destructive'
                                      })
                                    }
                                  }}
                                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                                  title={`Xóa ${user.full_name || user.email || 'user'}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )
                            })()}
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

