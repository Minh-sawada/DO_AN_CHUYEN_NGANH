-- =====================================================
-- SUPPORT CHAT SCHEMA
-- Hệ thống chat tư vấn hỗ trợ trực tuyến
-- =====================================================

-- Bảng support_conversations - Cuộc trò chuyện hỗ trợ
CREATE TABLE IF NOT EXISTS support_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT, -- Tên người dùng (nếu chưa đăng nhập)
    user_email TEXT, -- Email người dùng (nếu chưa đăng nhập)
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'closed', 'resolved')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Admin được assign
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng support_messages - Tin nhắn trong cuộc trò chuyện
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL nếu là user chưa đăng nhập
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    sender_name TEXT, -- Tên người gửi (nếu chưa đăng nhập)
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned_to ON support_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_conversations_last_message_at ON support_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_is_read ON support_messages(is_read);

-- Enable Row Level Security
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies cho support_conversations
-- Người dùng có thể xem cuộc trò chuyện của chính mình
CREATE POLICY "Users can view their own conversations" ON support_conversations
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Người dùng có thể tạo cuộc trò chuyện mới
CREATE POLICY "Users can create conversations" ON support_conversations
    FOR INSERT WITH CHECK (true);

-- Người dùng có thể cập nhật cuộc trò chuyện của mình (chỉ status)
CREATE POLICY "Users can update their own conversations" ON support_conversations
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- Admin có thể cập nhật tất cả cuộc trò chuyện
CREATE POLICY "Admins can update all conversations" ON support_conversations
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- RLS Policies cho support_messages
-- Người dùng có thể xem tin nhắn trong cuộc trò chuyện của mình
CREATE POLICY "Users can view messages in their conversations" ON support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_conversations
            WHERE support_conversations.id = support_messages.conversation_id
            AND (
                support_conversations.user_id = auth.uid() OR
                auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
            )
        )
    );

-- Người dùng có thể gửi tin nhắn
CREATE POLICY "Users can send messages" ON support_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_conversations
            WHERE support_conversations.id = support_messages.conversation_id
            AND (
                support_conversations.user_id = auth.uid() OR
                support_conversations.user_id IS NULL -- Cho phép user chưa đăng nhập
            )
        )
    );

-- Admin có thể gửi tin nhắn vào bất kỳ cuộc trò chuyện nào
CREATE POLICY "Admins can send messages to any conversation" ON support_messages
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Admin có thể cập nhật tin nhắn (đánh dấu đã đọc)
CREATE POLICY "Admins can update messages" ON support_messages
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Trigger để tự động cập nhật last_message_at và updated_at
CREATE OR REPLACE FUNCTION update_support_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_conversations
    SET 
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_support_conversation_timestamp();

-- Trigger để tự động cập nhật updated_at
CREATE TRIGGER update_support_conversations_updated_at
    BEFORE UPDATE ON support_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime cho real-time chat
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;

-- View để admin xem thống kê
CREATE OR REPLACE VIEW support_chat_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'open') as open_count,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
    COUNT(*) FILTER (WHERE priority = 'high') as high_count,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7d_count,
    COUNT(*) FILTER (WHERE assigned_to IS NULL AND status = 'open') as unassigned_count
FROM support_conversations;

