# Hướng Dẫn Cài Đặt GitHub App Cho Vercel

## Vấn Đề
GitHub app ban đầu do bạn tạo nên không hiển thị repo trên Vercel.

## Giải Pháp

### Cách 1: Cài Đặt GitHub App Trực Tiếp

1. **Click nút "Install" trên trang Vercel**
   - Ở phần "Import Git Repository"
   - Click nút có logo GitHub và text "Install"

2. **Chọn GitHub Account**
   - Chọn account chứa repo `DO_AN_CHUYEN_NGANH`
   - Thường là account: `Minh-sawada`

3. **Authorize Vercel**
   - Chọn quyền truy cập repositories
   - Click "Install" hoặc "Authorize"

4. **Quay lại Vercel**
   - Refresh trang
   - Repo sẽ hiển thị trong danh sách

---

### Cách 2: Cài Đặt Qua GitHub Settings

1. **Vào GitHub Settings**
   - Vào: https://github.com/settings/applications
   - Hoặc: GitHub Profile → Settings → Applications → Installed GitHub Apps

2. **Tìm Vercel App**
   - Tìm "Vercel" trong danh sách
   - Click vào

3. **Cấu Hình Quyền**
   - Chọn account: `Minh-sawada`
   - Chọn repositories: "All repositories" hoặc chỉ chọn `DO_AN_CHUYEN_NGANH`
   - Click "Save" hoặc "Update"

4. **Quay lại Vercel**
   - Refresh trang
   - Repo sẽ hiển thị

---

### Cách 3: Dùng Git URL Trực Tiếp

Nếu vẫn không thấy repo, bạn có thể dùng Git URL:

1. **Lấy Git URL**
   - Vào repo trên GitHub: https://github.com/Minh-sawada/DO_AN_CHUYEN_NGANH
   - Click nút "Code" (màu xanh)
   - Copy HTTPS URL: `https://github.com/Minh-sawada/DO_AN_CHUYEN_NGANH.git`

2. **Paste vào Vercel**
   - Ở phần "Enter a Git repository URL to deploy..."
   - Paste URL: `https://github.com/Minh-sawada/DO_AN_CHUYEN_NGANH.git`
   - Click "Continue"

3. **Vercel sẽ yêu cầu authorize**
   - Click "Authorize" nếu được hỏi
   - Chọn account GitHub

---

## Kiểm Tra

Sau khi cài đặt, bạn sẽ thấy:
- ✅ Repo `DO_AN_CHUYEN_NGANH` hiển thị trong danh sách
- ✅ Có thể click để import

## Troubleshooting

### Vẫn không thấy repo?
1. Kiểm tra repo có phải **private** không
   - Nếu private, cần cấp quyền cho Vercel
   - Hoặc làm repo **public** tạm thời

2. Kiểm tra đã chọn đúng **namespace** chưa
   - Dropdown "Select a Git Namespace" phải chọn đúng account

3. Thử **logout và login lại** Vercel

4. Thử dùng **Git URL trực tiếp** (Cách 3 ở trên)

---

## Lưu Ý

- GitHub app cần được cài cho **mỗi account/namespace**
- Nếu có nhiều GitHub accounts, cần cài cho account chứa repo
- Repo private cần cấp quyền riêng

