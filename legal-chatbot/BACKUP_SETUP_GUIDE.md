# 🔄 HƯỚNG DẪN SETUP BACKUP TỰ ĐỘNG

## Tổng quan
Hệ thống backup tự động sẽ backup database mỗi ngày lúc 00:00 và lưu vào Supabase Storage.

---

## BƯỚC 1: Tạo Storage Bucket "backups"

### Cách 1: Qua Supabase Dashboard (Dễ nhất)

1. **Vào Supabase Dashboard**
   - Truy cập: https://supabase.com/dashboard
   - Chọn project của bạn

2. **Vào Storage**
   - Click **Storage** ở sidebar bên trái
   - Click **New bucket**

3. **Tạo bucket mới**
   - **Name**: `backups`
   - **Public bucket**: Bật **OFF** (private) để bảo mật
   - **File size limit**: `52428800` (50MB) - **Giới hạn tối đa của Supabase**
   - **Allowed MIME types**: `application/json`, `application/zip`, `application/sql`
   - Click **Create bucket**

### Cách 2: Qua SQL (Tự động)

Chạy trong Supabase SQL Editor:

```sql
-- Tạo storage bucket cho backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'backups',
    'backups',
    false,  -- Private bucket
    52428800, -- 50MB limit (52428800 bytes = 50MB) - Giới hạn tối đa của Supabase
    ARRAY['application/json', 'application/zip', 'application/sql']
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 52428800;  -- Cập nhật nếu bucket đã tồn tại
```

---

## BƯỚC 2: Deploy Edge Function "auto-backup"

### Cách 1: Qua Supabase CLI (Khuyên dùng)

1. **Cài đặt Supabase CLI** (nếu chưa có)
   ```bash
   npm install -g supabase
   ```

2. **Đăng nhập Supabase**
   ```bash
   supabase login
   ```

3. **Link project**
   ```bash
   cd legal-chatbot
   supabase link --project-ref your-project-ref
   ```
   - `your-project-ref`: Lấy từ Supabase Dashboard > Settings > General > Reference ID

4. **Deploy function**
   ```bash
   supabase functions deploy auto-backup
   ```

5. **Set environment variables cho function**
   ```bash
   supabase secrets set SUPABASE_URL=your_supabase_url
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   - Lấy từ Supabase Dashboard > Settings > API

### Cách 2: Qua Supabase Dashboard (Nếu không dùng CLI)

1. **Vào Edge Functions**
   - Supabase Dashboard > **Edge Functions** ở sidebar
   - Click **Create a new function**

2. **Tạo function mới**
   - **Function name**: `auto-backup`
   - Copy nội dung từ `supabase/functions/auto-backup/index.ts`
   - Paste vào editor
   - Click **Deploy**

3. **Set secrets**
   - Vào **Settings** > **Edge Functions** > **Secrets**
   - Thêm:
     - `SUPABASE_URL`: URL của project
     - `SUPABASE_SERVICE_ROLE_KEY`: Service role key

---

## BƯỚC 3: Setup Cron Job

### Cách 1: Qua Supabase Dashboard

1. **Vào Database > Cron Jobs**
   - Supabase Dashboard > **Database** > **Cron Jobs**
   - Click **Create a new cron job**

2. **Tạo cron job**
   - **Name**: `daily-backup`
   - **Schedule**: `0 0 * * *` (mỗi ngày lúc 00:00)
   - **Command**: 
     ```sql
     SELECT net.http_post(
       url := 'https://your-project-ref.supabase.co/functions/v1/auto-backup',
       headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
     );
     ```
   - Click **Save**

### Cách 2: Qua SQL

Chạy trong Supabase SQL Editor:

```sql
-- Tạo cron job để chạy backup mỗi ngày lúc 00:00
-- Lưu ý: Cần thay your-project-ref và service-role-key

SELECT cron.schedule(
  'daily-backup',
  '0 0 * * *',  -- Mỗi ngày lúc 00:00
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/auto-backup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer your-service-role-key',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

**Thay thế:**
- `your-project-ref`: Lấy từ Supabase Dashboard > Settings > General > Reference ID
- `your-service-role-key`: Lấy từ Supabase Dashboard > Settings > API > Service role key

---

## BƯỚC 4: Setup Database (Nếu chưa có)

Chạy trong Supabase SQL Editor:

1. **Chạy file `database/schema.sql`**
   - Nếu chưa chạy, copy và chạy toàn bộ file

2. **Hoặc chỉ chạy phần backup system:**
   - Chạy file `database/backup-system.sql`

---

## BƯỚC 5: Bật Auto Backup

### Qua Admin Panel (Dễ nhất)

1. Vào Admin Panel → Tab **Backup**
2. Click nút **Bật** ở phần "Backup tự động"

### Qua SQL

```sql
-- Bật auto backup
UPDATE backup_settings
SET 
  auto_backup_enabled = true,
  backup_frequency = 'daily',
  retention_days = 30,
  encryption_enabled = true,
  updated_at = NOW()
WHERE id = (SELECT id FROM backup_settings LIMIT 1);

-- Nếu chưa có record, tạo mới
INSERT INTO backup_settings (
  auto_backup_enabled,
  backup_frequency,
  retention_days,
  encryption_enabled,
  max_backup_size_mb
)
VALUES (
  true,
  'daily',
  30,
  true,
  100
)
ON CONFLICT DO NOTHING;
```

---

## BƯỚC 6: Kiểm tra

### Test thủ công

**Cách 1: Qua Admin Panel (Dễ nhất)** ⭐

1. Vào Admin Panel → Tab **Backup**
2. Click nút **"Tạo Backup Thủ Công"**
3. Đợi vài giây, sẽ thấy file backup trong bucket

**Cách 2: Qua Script (Node.js)**

```bash
# Chạy script test backup
node scripts/test-backup-manual.js
```

Script này sẽ:
- ✅ Kiểm tra cấu hình backup
- ✅ Export dữ liệu từ database
- ✅ Upload lên Supabase Storage
- ✅ Tạo backup log
- ✅ Lưu file về local (thư mục `backups/`)

**Cách 3: Qua API**

```bash
# Test qua curl
curl -X POST \
  http://localhost:3000/api/backup/manual \
  -H "Content-Type: application/json"
```

**Cách 4: Test Edge Function**

```bash
# Qua curl
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/auto-backup \
  -H "Authorization: Bearer your-service-role-key" \
  -H "Content-Type: application/json"
```

### Kiểm tra kết quả

1. **Kiểm tra trong Admin Panel**
   - Vào Admin Panel → Tab **Backup**
   - Xem trạng thái:
     - ✅ Database Tables: Sẵn sàng
     - ✅ Storage Bucket: Sẵn sàng
     - ✅ Edge Function: Đã setup

2. **Kiểm tra lịch sử backup**
   - Xem tab **Backup** → Phần "Lịch sử Backup"
   - Nếu có backup thành công nghĩa là đã hoạt động

3. **Kiểm tra Supabase Storage**
   - Vào Supabase Dashboard → Storage → Buckets → `backups`
   - Sẽ thấy file backup dạng `backup-YYYY-MM-DD-HH-MM-SS.json`

---

## ✅ Checklist hoàn thành

- [ ] Đã tạo storage bucket `backups`
- [ ] Đã deploy Edge Function `auto-backup`
- [ ] Đã set environment variables cho function
- [ ] Đã setup cron job chạy mỗi ngày
- [ ] Đã chạy `database/backup-system.sql` hoặc `database/schema.sql`
- [ ] Đã bật `auto_backup_enabled = true` trong `backup_settings`
- [ ] Đã test tạo backup thủ công thành công

---

## 🆘 Xử lý lỗi

### Lỗi: "Bucket not found"
- Kiểm tra đã tạo bucket `backups` chưa
- Kiểm tra tên bucket chính xác là `backups`

### Lỗi: "Function not found"
- Kiểm tra đã deploy function `auto-backup` chưa
- Kiểm tra URL function đúng chưa

### Lỗi: "Auto backup is disabled"
- Bật `auto_backup_enabled = true` trong `backup_settings`

### Cron job không chạy
- Kiểm tra cron schedule có đúng format không
- Kiểm tra URL và headers trong cron command
- Xem logs trong Supabase Dashboard > Edge Functions > Logs

---

## 📝 Lưu ý

1. **Service Role Key**: Cần bảo mật, không commit lên git
2. **Cron Schedule**: Format `0 0 * * *` = mỗi ngày lúc 00:00 UTC
3. **Storage Limits**: Kiểm tra dung lượng storage bucket
4. **Backup Size**: Mặc định giới hạn 100MB mỗi backup

---

## 🎉 Hoàn thành!

Sau khi setup xong, hệ thống sẽ tự động backup mỗi ngày lúc 00:00 UTC và lưu vào Supabase Storage.

