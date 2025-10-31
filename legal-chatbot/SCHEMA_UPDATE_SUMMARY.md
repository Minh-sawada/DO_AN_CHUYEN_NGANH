# Tổng hợp các thay đổi để khớp với Schema mới

## ✅ Đã hoàn thành

### 1. **Interfaces và Types** (`src/lib/supabase.ts`)
- ✅ `Law` interface - đã đầy đủ các fields theo schema
- ✅ `Profile` interface - đã thêm `updated_at`
- ✅ `QueryLog` interface - đã sửa:
  - `id`: `number` → `string` (UUID)
  - `matched_ids`: `number[]` → `string[]` (UUID[])

### 2. **Types Database** (`src/types/supabase.ts`)
- ✅ `laws` table types - đã cập nhật đầy đủ fields
- ✅ `profiles` table types - đã thêm `updated_at`
- ✅ `query_logs` table types - đã sửa `id` và `matched_ids` thành UUID

### 3. **Components**
- ✅ `AdminPanel.tsx` - đã sửa `QueryLogWithProfile` interface
- ✅ `AdminDashboard.tsx` - đã sửa để dùng `noi_dung` thay vì `content`
- ✅ `ChatInterface.tsx` - đã sửa source interface để dùng `so_hieu`, `loai_van_ban`

### 4. **API Routes**
- ✅ `upload-simple/route.ts` - đã sửa để dùng `noi_dung` thay vì `content`
- ✅ `test-db/route.ts` - đã đúng với schema

### 5. **Database Functions** (`database/functions.sql`)
- ✅ `match_laws()` - đã cập nhật để dùng `noi_dung`, `so_hieu`, `loai_van_ban`

### 6. **Database Schema** (`database/schema.sql`)
- ✅ `match_laws()` function - đã đúng với schema
- ✅ `get_law_stats()` function - đã đúng

## 📋 Schema mới (theo `database/schema.sql`)

### Bảng `laws`:
- `id`: BIGSERIAL (number)
- `_id`: TEXT
- `category`: TEXT
- `danh_sach_bang`: TEXT
- `link`: TEXT
- `loai_van_ban`: TEXT
- `ngay_ban_hanh`: TEXT
- `ngay_cong_bao`: TEXT
- `ngay_hieu_luc`: TEXT
- `nguoi_ky`: TEXT
- `noi_ban_hanh`: TEXT
- `noi_dung`: TEXT (thay vì `content`)
- `noi_dung_html`: TEXT
- `so_cong_bao`: TEXT
- `so_hieu`: TEXT (thay vì `article_reference`)
- `thuoc_tinh_html`: TEXT
- `tinh_trang`: TEXT
- `title`: TEXT
- `tom_tat`: TEXT
- `tom_tat_html`: TEXT
- `van_ban_duoc_dan`: TEXT
- `embedding`: VECTOR(1536)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### Bảng `profiles`:
- `id`: UUID (string)
- `full_name`: TEXT
- `role`: TEXT ('admin' | 'user')
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP ✅ Đã thêm vào interface

### Bảng `query_logs`:
- `id`: UUID (string) ✅ Đã sửa từ number
- `user_id`: UUID (string | null)
- `query`: TEXT
- `response`: TEXT
- `matched_ids`: UUID[] (string[]) ✅ Đã sửa từ number[]
- `created_at`: TIMESTAMP

## 🔄 Mapping Fields cũ → Mới

| Field cũ | Field mới |
|----------|-----------|
| `content` | `noi_dung` |
| `article_reference` | `so_hieu` |
| `source` | Không có (có thể dùng `title` hoặc `category`) |

## ⚠️ Lưu ý

1. **query_logs.id**: Giờ là UUID (string), không phải number nữa
2. **query_logs.matched_ids**: Giờ là UUID[] (string[]), không phải number[] nữa
3. **Laws**: Không còn `content`, `article_reference`, `source`. Dùng `noi_dung`, `so_hieu` thay thế
4. **Profile**: Có thêm `updated_at` field

## 📝 Bước tiếp theo

1. Chạy lại `database/schema.sql` trong Supabase SQL Editor
2. Chạy lại `database/functions.sql` để cập nhật functions
3. Restart dev server: `npm run dev`
4. Test lại các chức năng

