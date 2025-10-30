-- Cập nhật lại bảng laws với đầy đủ 20 cột
CREATE TABLE IF NOT EXISTS laws (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    _id TEXT,                     -- ID từ nguồn dữ liệu gốc
    category TEXT NOT NULL,       -- Loại/danh mục văn bản
    danh_sach_bang TEXT,         -- Danh sách bảng
    link TEXT,                    -- Link tham chiếu
    loai_van_ban TEXT NOT NULL,   -- Loại văn bản
    ngay_ban_hanh DATE,          -- Ngày ban hành
    ngay_cong_bao DATE,          -- Ngày công báo
    ngay_hieu_luc DATE,          -- Ngày hiệu lực
    nguoi_ky TEXT,               -- Người ký văn bản
    noi_ban_hanh TEXT NOT NULL,   -- Nơi ban hành
    noi_dung TEXT NOT NULL,       -- Nội dung văn bản
    noi_dung_html TEXT,          -- Nội dung định dạng HTML
    so_cong_bao TEXT,            -- Số công báo
    so_hieu TEXT NOT NULL,        -- Số hiệu văn bản
    thuoc_tinh_html TEXT,        -- Các thuộc tính HTML
    tinh_trang TEXT,             -- Tình trạng hiệu lực
    title TEXT NOT NULL,          -- Tiêu đề văn bản
    tom_tat TEXT,                -- Tóm tắt văn bản
    tom_tat_html TEXT,           -- Tóm tắt định dạng HTML
    van_ban_duoc_dan TEXT,       -- Văn bản được dẫn chiếu
    embedding VECTOR(768),       -- Vector embedding cho tìm kiếm ngữ nghĩa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index cho tìm kiếm
CREATE INDEX IF NOT EXISTS idx_laws_category ON laws(category);
CREATE INDEX IF NOT EXISTS idx_laws_loai_van_ban ON laws(loai_van_ban);
CREATE INDEX IF NOT EXISTS idx_laws_ngay_ban_hanh ON laws(ngay_ban_hanh);
CREATE INDEX IF NOT EXISTS idx_laws_so_hieu ON laws(so_hieu);
CREATE INDEX IF NOT EXISTS idx_laws_title ON laws USING GIN (to_tsvector('vietnamese', title));
CREATE INDEX IF NOT EXISTS idx_laws_noi_dung ON laws USING GIN (to_tsvector('vietnamese', noi_dung));

-- Index vector search
CREATE INDEX IF NOT EXISTS idx_laws_embedding ON laws USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_laws_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_laws_updated_at_trigger
    BEFORE UPDATE ON laws
    FOR EACH ROW
    EXECUTE FUNCTION update_laws_updated_at();