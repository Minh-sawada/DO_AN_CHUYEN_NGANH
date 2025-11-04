# Hướng Dẫn Phân Quyền Người Dùng

## Tổng Quan

Hệ thống hỗ trợ 3 vai trò (roles) với các quyền hạn khác nhau:

1. **Admin (Quản trị viên)** - Quyền cao nhất
2. **Editor (Biên tập viên)** - Quyền trung bình
3. **User (Người dùng)** - Quyền cơ bản

## Phân Quyền Chi Tiết

### Admin (Quản trị viên)
Có tất cả quyền trong hệ thống:
- ✅ Xem, upload, edit, delete laws
- ✅ Xem tất cả query logs
- ✅ Quản lý người dùng (thay đổi roles)
- ✅ Ban/Unban users
- ✅ Quản lý backup
- ✅ Xem system logs
- ✅ Quản lý hệ thống

### Editor (Biên tập viên)
Có quyền quản lý nội dung:
- ✅ Xem laws
- ✅ Upload laws
- ✅ Edit laws
- ❌ Delete laws (chỉ admin mới có quyền)
- ✅ Xem tất cả query logs
- ❌ Quản lý người dùng
- ❌ Ban/Unban users
- ❌ Quản lý backup
- ❌ Xem system logs

### User (Người dùng)
Quyền cơ bản:
- ✅ Xem laws
- ✅ Chat với chatbot
- ✅ Xem query logs của chính mình
- ❌ Upload laws
- ❌ Edit laws
- ❌ Delete laws
- ❌ Xem query logs của người khác
- ❌ Quản lý người dùng

## Setup Database

### Bước 1: Chạy Migration SQL

Chạy file `database/add-editor-role.sql` trong Supabase SQL Editor để:
- Thêm role 'editor' vào CHECK constraint
- Cập nhật RLS policies để hỗ trợ editor role

```sql
-- File: database/add-editor-role.sql
```

### Bước 2: Cập nhật User Roles

Để thay đổi role của một user, bạn có thể:

1. **Qua Admin Panel:**
   - Đăng nhập với tài khoản admin
   - Vào Admin Panel > Quản trị hệ thống > Quản lý người dùng
   - Chọn user và thay đổi role từ dropdown

2. **Qua SQL (Supabase SQL Editor):**
   ```sql
   -- Đặt role thành admin
   UPDATE profiles SET role = 'admin' WHERE id = 'user-id-here';
   
   -- Đặt role thành editor
   UPDATE profiles SET role = 'editor' WHERE id = 'user-id-here';
   
   -- Đặt role thành user
   UPDATE profiles SET role = 'user' WHERE id = 'user-id-here';
   ```

## Sử dụng Permission Utilities

### Import utilities

```typescript
import { 
  isAdmin, 
  isEditor, 
  isAdminOrEditor,
  hasPermission,
  canManageLaws,
  canDeleteLaws,
  canManageUsers,
  getRoleDisplayName,
  getRoleBadgeColor
} from '@/lib/permissions'
```

### Kiểm tra quyền

```typescript
// Kiểm tra role
if (isAdmin(profile)) {
  // Chỉ admin mới vào đây
}

if (isEditor(profile)) {
  // Chỉ editor mới vào đây
}

if (isAdminOrEditor(profile)) {
  // Admin hoặc editor vào đây
}

// Kiểm tra permission cụ thể
if (hasPermission(profile, 'upload_laws')) {
  // User có quyền upload laws
}

if (canManageLaws(profile)) {
  // User có thể quản lý laws (admin hoặc editor)
}

if (canDeleteLaws(profile)) {
  // Chỉ admin mới có quyền này
}

if (canManageUsers(profile)) {
  // Chỉ admin mới có quyền này
}
```

### Hiển thị role

```typescript
// Lấy tên hiển thị
const roleName = getRoleDisplayName(profile.role)
// Returns: 'Quản trị viên', 'Biên tập viên', hoặc 'Người dùng'

// Lấy màu badge
const badgeColor = getRoleBadgeColor(profile.role)
// Returns: 'bg-red-600 text-white', 'bg-blue-600 text-white', hoặc 'bg-gray-600 text-white'
```

## API Routes Protection

### Server-side (API Routes)

```typescript
import { requireAdmin, requireEditor } from '@/lib/auth-utils'

// Chỉ admin mới được truy cập
export async function POST(request: NextRequest) {
  const { session, profile } = await requireAdmin()
  // ... logic
}

// Admin hoặc editor được truy cập
export async function POST(request: NextRequest) {
  const { session, profile } = await requireEditor()
  // ... logic
}
```

### Middleware Protection

Middleware đã được cập nhật để:
- `/api/laws/upload` - Yêu cầu admin hoặc editor
- `/api/admin/*` - Chỉ admin
- `/api/upload/*` - Admin hoặc editor (cho upload operations)

## UI Components

### Admin Panel

- **Admin**: Thấy tất cả tabs (Dashboard, Upload, Queries, Stats, System, Backup)
- **Editor**: Chỉ thấy (Dashboard, Upload, Queries, Stats)
- **User**: Không thể truy cập Admin Panel

### System Management

- **Admin**: Có thể quản lý users, ban users, xem logs
- **Editor**: Không thể truy cập tab này

## Các File Đã Cập Nhật

1. `database/add-editor-role.sql` - Migration SQL
2. `src/lib/supabase.ts` - Cập nhật Profile interface
3. `src/types/supabase.ts` - Cập nhật types
4. `src/lib/permissions.ts` - Utility functions mới
5. `src/lib/auth-utils.ts` - Thêm requireEditor()
6. `middleware.ts` - Cập nhật để hỗ trợ editor
7. `src/app/api/admin/update-profile/route.ts` - Hỗ trợ role editor
8. `src/components/admin/AdminPanel.tsx` - Ẩn/hiện tabs theo role
9. `src/components/admin/SystemManagement.tsx` - Thêm tab quản lý users
10. `src/app/admin/page.tsx` - Cho phép editor truy cập

## Testing

1. Tạo user mới và đặt role là 'editor'
2. Đăng nhập với editor account
3. Kiểm tra:
   - ✅ Có thể truy cập Admin Panel
   - ✅ Có thể upload/edit laws
   - ✅ Không thể xóa laws
   - ✅ Không thấy tab "Quản trị hệ thống" và "Backup"
   - ✅ Không thể quản lý users

## Troubleshooting

### User không thể truy cập Admin Panel

1. Kiểm tra role trong database:
   ```sql
   SELECT id, role FROM profiles WHERE id = 'user-id';
   ```

2. Đảm bảo đã chạy migration SQL

3. Clear cache và đăng nhập lại

### Editor không thể upload laws

1. Kiểm tra middleware có chạy đúng không
2. Kiểm tra RLS policies trong database
3. Xem logs trong browser console và server logs

