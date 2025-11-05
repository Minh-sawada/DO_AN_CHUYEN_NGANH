# Cách Setup Role System KHÔNG CẦN Thay Đổi Database

## Vấn đề

Nếu bạn không muốn chạy SQL migration trên Supabase, có một cách workaround: **Sử dụng role 'user' nhưng phân biệt bằng metadata hoặc code logic**.

## Giải pháp 1: Sử dụng Metadata (Khuyến nghị)

### Cách hoạt động:
- Tất cả editor vẫn có `role = 'user'` trong database
- Lưu thông tin thực tế trong field `full_name` hoặc tạo metadata field mới

### Implementation:

#### Option A: Sử dụng prefix trong full_name
```typescript
// Khi set editor, thêm prefix
await supabase
  .from('profiles')
  .update({ 
    full_name: '[EDITOR]' + user.full_name,
    // role vẫn là 'user'
  })

// Khi check permission
function isEditor(profile: Profile | null): boolean {
  return profile?.full_name?.startsWith('[EDITOR]') || profile?.role === 'editor'
}
```

#### Option B: Tạo metadata field riêng (nếu có)
Nếu bạn có thể thêm một field TEXT mới vào profiles mà không cần constraint:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT;
-- Không có constraint, nên có thể set bất kỳ giá trị nào
```

## Giải pháp 2: Application-Level Only (Không khuyến nghị)

### Cách hoạt động:
- Code sẽ kiểm tra permission dựa trên logic, không dựa vào database
- Database vẫn chỉ có 'admin' và 'user'
- Editor được xử lý như user đặc biệt trong code

### Vấn đề:
- ❌ RLS policies không thể phân biệt editor
- ❌ Phải bypass RLS ở nhiều nơi
- ❌ Khó maintain và dễ lỗi

## Giải pháp 3: Migration An Toàn (Khuyến nghị nhất)

### Tại sao migration này an toàn:

1. **Chỉ thay đổi constraint (rule validation)**
   - Không xóa, không sửa dữ liệu hiện có
   - Tất cả users hiện tại vẫn giữ nguyên role

2. **Có thể rollback dễ dàng**
   ```sql
   -- Rollback nếu cần
   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
   ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));
   ```

3. **Test trên database copy trước**
   - Tạo database test trong Supabase
   - Chạy migration trên database test
   - Verify mọi thứ hoạt động
   - Sau đó mới chạy trên production

### Migration tối thiểu (chỉ 2 dòng):

File: `database/add-editor-role-minimal.sql`
```sql
```

## So sánh các giải pháp

| Giải pháp | An toàn | Dễ maintain | RLS support | Khuyến nghị |
|-----------|---------|-------------|-------------|-------------|
| Migration SQL | ✅✅✅ | ✅✅✅ | ✅✅✅ | ⭐⭐⭐ |
| Metadata field | ✅✅ | ✅✅ | ❌ | ⭐⭐ |
| Application-only | ✅ | ❌ | ❌ | ⭐ |

## Khuyến nghị

**Nên dùng Migration SQL** vì:
1. An toàn - chỉ thay đổi rule, không đụng dữ liệu
2. RLS policies hoạt động đúng
3. Code đơn giản, dễ maintain
4. Có thể rollback dễ dàng

**Nếu thực sự không muốn chạy SQL**, dùng giải pháp Metadata với prefix trong full_name.

## Cách test migration an toàn

1. **Tạo database test:**
   - Supabase Dashboard > Settings > Database
   - Tạo database mới để test

2. **Chạy migration trên test:**
   ```sql
   -- Chạy file add-editor-role-minimal.sql
   ```

3. **Verify:**
   ```sql
   -- Kiểm tra constraint mới
   SELECT constraint_name, check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name = 'profiles_role_check';
   
   -- Kiểm tra dữ liệu vẫn nguyên
   SELECT id, role FROM profiles;
   ```

4. **Nếu OK, chạy trên production**

