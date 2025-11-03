# 📋 HƯỚNG DẪN UPLOAD FILE LUẬT

## ✅ Cách upload file luật thành công

### **Bước 1: Download file mẫu**
1. Vào **Admin Panel** → Tab **"Văn bản pháp luật"**
2. Click nút **"Download file mẫu"**
3. File `sample-laws.json` sẽ được tải về

### **Bước 2: Kiểm tra file trước khi upload**
⚠️ **QUAN TRỌNG**: Mở file bằng text editor (Notepad, VS Code, v.v.) để kiểm tra:

- ✅ File phải bắt đầu bằng `[` hoặc `{`
- ✅ Phải là JSON hợp lệ (có thể validate online tại jsonlint.com)
- ❌ KHÔNG được là file ZIP, PDF, hoặc Word

**Cách kiểm tra nhanh:**
```json
[
  {
    "title": "...",
    ...
  }
]
```

Nếu thấy file bắt đầu bằng `PK` hoặc có ký tự lạ → File bị lỗi, tải lại!

### **Bước 3: Upload file**
1. Trong Admin Panel, click **"Chọn file JSON"**
2. Chọn file `sample-laws.json` vừa tải
3. Click **"Upload"**
4. Đợi kết quả

---

## 🐛 Xử lý lỗi thường gặp

### **Lỗi: "File JSON không hợp lệ: Unexpected token 'P', 'PK'..."**

**Nguyên nhân:**
- File download bị lỗi (thường do browser)
- File bị nén ZIP thay vì JSON
- File encoding sai

**Giải pháp:**
1. **Tải lại file mẫu** từ Admin Panel
2. **Kiểm tra file**: Mở bằng text editor, phải thấy `[{` ở đầu file
3. **Nếu vẫn lỗi**: Copy nội dung từ file `sample-laws.json` trong project và tạo file mới

### **Lỗi: "File không chứa dữ liệu"**

**Nguyên nhân:** File JSON rỗng hoặc array trống

**Giải pháp:** Đảm bảo file có ít nhất 1 object trong array

### **Lỗi: "Thiếu title hoặc so_hieu"**

**Nguyên nhân:** Mỗi văn bản cần có ít nhất `title` hoặc `so_hieu`

**Giải pháp:** Thêm field bắt buộc vào mỗi object trong file

---

## 📝 Format file JSON chuẩn

```json
[
  {
    "_id": "unique-id",
    "title": "Tiêu đề văn bản",
    "so_hieu": "ND-2024/001",
    "loai_van_ban": "Nghị định",
    "noi_ban_hanh": "Chính phủ",
    "ngay_ban_hanh": "2024-01-15",
    "ngay_hieu_luc": "2024-02-01",
    "nguoi_ky": "Thủ tướng Chính phủ",
    "category": "Luật hành chính",
    "tinh_trang": "Còn hiệu lực",
    "noi_dung": "Nội dung văn bản...",
    "noi_dung_html": "<p>Nội dung HTML...</p>",
    "tom_tat": "Tóm tắt văn bản",
    "link": "https://example.com/link",
    "so_cong_bao": "15/2024"
  }
]
```

### **Các trường bắt buộc:**
- `title` HOẶC `so_hieu` (ít nhất 1 trong 2)

### **Các trường tùy chọn:**
- `_id`, `category`, `loai_van_ban`, `noi_ban_hanh`
- `ngay_ban_hanh`, `ngay_hieu_luc`, `ngay_cong_bao`
- `nguoi_ky`, `tinh_trang`, `noi_dung`, `noi_dung_html`
- `tom_tat`, `tom_tat_html`, `link`, `so_cong_bao`
- `van_ban_duoc_dan`, `danh_sach_bang`, `thuoc_tinh_html`

---

## 💡 Tips

1. **Luôn kiểm tra file trước khi upload** - Mở bằng text editor
2. **Validate JSON online** - Dùng jsonlint.com để kiểm tra
3. **File size** - Không quá lớn, nên chia nhỏ nếu có nhiều văn bản
4. **Encoding** - Đảm bảo file là UTF-8
5. **Backup** - Giữ bản backup trước khi upload

---

## 🔗 Links hữu ích

- [JSON Validator](https://jsonlint.com/)
- [JSON Formatter](https://jsonformatter.org/)
- File mẫu: `/api/laws/sample`

---

## 📞 Hỗ trợ

Nếu gặp lỗi, hãy:
1. Kiểm tra console browser (F12) để xem lỗi chi tiết
2. Kiểm tra file JSON bằng validator online
3. Thử tải lại file mẫu từ Admin Panel

