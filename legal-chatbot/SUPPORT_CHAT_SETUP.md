# Hướng Dẫn Setup Hệ Thống Tư Vấn Hỗ Trợ Trực Tuyến

## Tổng Quan

Hệ thống tư vấn hỗ trợ trực tuyến cho phép người dùng chat trực tiếp với admin/support team. Hệ thống hỗ trợ real-time messaging với Supabase Realtime.

## Tính Năng

- ✅ Chat widget floating button cho người dùng
- ✅ Real-time messaging với Supabase Realtime
- ✅ Admin panel để quản lý và trả lời
- ✅ Hỗ trợ người dùng chưa đăng nhập
- ✅ Đánh dấu đã đọc tin nhắn
- ✅ Quản lý trạng thái và độ ưu tiên cuộc trò chuyện
- ✅ Tìm kiếm và lọc cuộc trò chuyện

## Cài Đặt

### 1. Tạo Database Schema

Chạy file SQL sau trong Supabase SQL Editor:

```sql
-- File: database/support-chat-schema.sql
```

Hoặc copy nội dung từ file `legal-chatbot/database/support-chat-schema.sql` và chạy trong Supabase SQL Editor.

### 2. Enable Realtime

Đảm bảo Realtime đã được enable trong Supabase:
1. Vào Supabase Dashboard
2. Settings → API
3. Kiểm tra Realtime đã được bật

### 3. Kiểm Tra Cài Đặt

Sau khi chạy SQL, kiểm tra:
1. Bảng `support_conversations` đã được tạo
2. Bảng `support_messages` đã được tạo
3. RLS policies đã được thiết lập
4. Realtime đã được enable cho các bảng
5. Indexes đã được tạo

## Sử Dụng

### Cho Người Dùng

1. **Mở Chat Widget**:
   - Click vào nút chat floating ở góc dưới bên phải
   - Widget sẽ mở ra với giao diện chat

2. **Gửi Tin Nhắn**:
   - Nhập tin nhắn vào ô input
   - Nhấn Enter hoặc click nút Send
   - Tin nhắn sẽ được gửi và hiển thị real-time

3. **Nhận Phản Hồi**:
   - Tin nhắn từ admin sẽ tự động hiển thị
   - Có thông báo khi có tin nhắn mới

### Cho Admin

1. **Truy Cập Admin Panel**:
   - Vào `/admin`
   - Click tab **"Hỗ Trợ"**

2. **Xem Danh Sách Cuộc Trò Chuyện**:
   - Danh sách hiển thị tất cả cuộc trò chuyện
   - Badge hiển thị số tin nhắn chưa đọc
   - Có thể lọc theo trạng thái

3. **Trả Lời Tin Nhắn**:
   - Click vào một cuộc trò chuyện
   - Xem lịch sử tin nhắn
   - Gửi phản hồi trong ô input

4. **Quản Lý Cuộc Trò Chuyện**:
   - Thay đổi trạng thái (open, waiting, closed, resolved)
   - Thay đổi độ ưu tiên (low, normal, high, urgent)
   - Assign cho admin khác

## Cấu Trúc Database

### Bảng `support_conversations`

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | UUID | ID duy nhất |
| user_id | UUID | ID người dùng (nullable) |
| user_name | TEXT | Tên người dùng (nếu chưa đăng nhập) |
| user_email | TEXT | Email người dùng (nếu chưa đăng nhập) |
| status | VARCHAR(20) | Trạng thái: open, waiting, closed, resolved |
| priority | VARCHAR(10) | Độ ưu tiên: low, normal, high, urgent |
| assigned_to | UUID | Admin được assign |
| last_message_at | TIMESTAMP | Thời gian tin nhắn cuối |
| created_at | TIMESTAMP | Thời gian tạo |
| updated_at | TIMESTAMP | Thời gian cập nhật |

### Bảng `support_messages`

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | UUID | ID duy nhất |
| conversation_id | UUID | ID cuộc trò chuyện |
| sender_id | UUID | ID người gửi (nullable) |
| sender_type | VARCHAR(10) | Loại: user, admin, system |
| sender_name | TEXT | Tên người gửi (nếu chưa đăng nhập) |
| content | TEXT | Nội dung tin nhắn |
| is_read | BOOLEAN | Đã đọc chưa |
| read_at | TIMESTAMP | Thời gian đọc |
| created_at | TIMESTAMP | Thời gian tạo |

## API Endpoints

### GET /api/support/conversations

Lấy danh sách cuộc trò chuyện.

**Query Parameters:**
- `status`: Lọc theo trạng thái
- `userId`: Lọc theo user ID
- `limit`: Số lượng kết quả (mặc định: 50)
- `offset`: Vị trí bắt đầu (mặc định: 0)

### POST /api/support/conversations

Tạo cuộc trò chuyện mới.

**Request Body:**
```json
{
  "userId": "uuid-optional",
  "userName": "Tên người dùng",
  "userEmail": "email@example.com",
  "initialMessage": "Tin nhắn ban đầu (optional)"
}
```

### GET /api/support/messages

Lấy tin nhắn trong cuộc trò chuyện.

**Query Parameters:**
- `conversationId`: ID cuộc trò chuyện (required)
- `limit`: Số lượng kết quả (mặc định: 100)
- `offset`: Vị trí bắt đầu (mặc định: 0)

### POST /api/support/messages

Gửi tin nhắn mới.

**Request Body:**
```json
{
  "conversationId": "uuid",
  "senderId": "uuid-optional",
  "senderType": "user|admin|system",
  "senderName": "Tên người gửi",
  "content": "Nội dung tin nhắn"
}
```

### PATCH /api/support/conversations/[id]

Cập nhật cuộc trò chuyện.

**Request Body:**
```json
{
  "status": "open|waiting|closed|resolved",
  "priority": "low|normal|high|urgent",
  "assignedTo": "uuid-optional"
}
```

### PATCH /api/support/messages/[id]/read

Đánh dấu tin nhắn đã đọc.

**Request Body:**
```json
{
  "conversationId": "uuid"
}
```

## Real-time Updates

Hệ thống sử dụng Supabase Realtime để cập nhật tin nhắn real-time:

- Khi có tin nhắn mới, cả user và admin sẽ nhận được cập nhật ngay lập tức
- Không cần refresh trang
- Tự động scroll đến tin nhắn mới nhất

## RLS Policies

### support_conversations

- **Users**: Có thể xem và tạo cuộc trò chuyện của chính mình
- **Admins**: Có thể xem và quản lý tất cả cuộc trò chuyện

### support_messages

- **Users**: Có thể xem và gửi tin nhắn trong cuộc trò chuyện của mình
- **Admins**: Có thể xem và gửi tin nhắn vào bất kỳ cuộc trò chuyện nào

## Troubleshooting

### Lỗi: "relation support_conversations does not exist"

Chạy lại file SQL migration `database/support-chat-schema.sql` trong Supabase SQL Editor.

### Lỗi: "permission denied for table support_conversations"

Kiểm tra RLS policies đã được tạo đúng chưa. Chạy lại phần RLS policies trong file SQL.

### Real-time không hoạt động

1. Kiểm tra Realtime đã được enable trong Supabase Dashboard
2. Kiểm tra ALTER PUBLICATION đã được chạy trong SQL
3. Kiểm tra network connection
4. Kiểm tra browser console có lỗi không

### Tin nhắn không hiển thị

1. Kiểm tra API response có thành công không
2. Kiểm tra RLS policies
3. Kiểm tra conversation_id có đúng không
4. Kiểm tra browser console có lỗi không

## Tùy Chỉnh

### Thay Đổi Vị Trí Widget

Sửa trong `src/components/support/SupportChatWidget.tsx`:

```tsx
// Thay đổi vị trí floating button
className="fixed bottom-6 right-6" // Thay đổi bottom/right
```

### Thay Đổi Kích Thước Chat Window

Sửa trong `src/components/support/SupportChatWidget.tsx`:

```tsx
<Card className="fixed bottom-24 right-6 w-96 h-[600px]">
  {/* Thay đổi w-96 (width) và h-[600px] (height) */}
</Card>
```

### Thêm Notification Sound

Thêm vào `SupportChatWidget.tsx`:

```tsx
useEffect(() => {
  if (messages.length > 0 && messages[messages.length - 1].sender_type === 'admin') {
    // Play notification sound
    const audio = new Audio('/notification.mp3')
    audio.play()
  }
}, [messages])
```

## Ghi Chú

- Widget tự động hiển thị trên tất cả các trang
- Người dùng chưa đăng nhập vẫn có thể sử dụng (với user_name và user_email)
- Admin có thể quản lý tất cả cuộc trò chuyện
- Real-time updates hoạt động tự động, không cần cấu hình thêm
- Tin nhắn được lưu vĩnh viễn trong database

