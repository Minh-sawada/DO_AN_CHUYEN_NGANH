const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLogging() {
  console.log('🔍 Kiểm tra hệ thống logging...\n');

  // Test 1: Kiểm tra database function log_user_activity
  console.log('1. Kiểm tra database function log_user_activity...');
  try {
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID for test
    
    const { data, error } = await supabase.rpc('log_user_activity', {
      p_user_id: testUserId,
      p_activity_type: 'query', // Phải là một trong: 'login', 'logout', 'query', 'upload', 'delete', 'update', 'view', 'download', 'export', 'admin_action'
      p_action: 'test_logging',
      p_details: { test: true },
      p_ip_address: '127.0.0.1',
      p_user_agent: 'test-script',
      p_risk_level: 'low'
    });

    if (error) {
      console.error('❌ Lỗi khi gọi log_user_activity:', error.message);
      console.error('   Chi tiết:', error);
      
      if (error.message.includes('function') || error.message.includes('does not exist')) {
        console.error('\n⚠️  Database function chưa được tạo!');
        console.error('   Chạy: npm run setup-db hoặc chạy file database/system-management.sql\n');
      }
    } else {
      console.log('✅ Database function log_user_activity hoạt động!');
      console.log('   Activity ID:', data);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }

  console.log('\n2. Kiểm tra bảng user_activities...');
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Lỗi khi truy vấn user_activities:', error.message);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.error('\n⚠️  Bảng user_activities chưa được tạo!');
        console.error('   Chạy: npm run setup-db hoặc chạy file database/system-management.sql\n');
      }
    } else {
      console.log('✅ Bảng user_activities tồn tại!');
      console.log('   Số lượng records:', data?.length || 0);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }

  console.log('\n3. Kiểm tra bảng system_logs...');
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Lỗi khi truy vấn system_logs:', error.message);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.error('\n⚠️  Bảng system_logs chưa được tạo!');
        console.error('   Chạy: npm run setup-db hoặc chạy file database/system-management.sql\n');
      }
    } else {
      console.log('✅ Bảng system_logs tồn tại!');
      console.log('   Số lượng records:', data?.length || 0);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }

  console.log('\n4. Test API /api/system/log-activity...');
  try {
    const response = await fetch('http://localhost:3000/api/system/log-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: '00000000-0000-0000-0000-000000000000',
        activity_type: 'query', // Phải là một trong: 'login', 'logout', 'query', 'upload', 'delete', 'update', 'view', 'download', 'export', 'admin_action'
        action: 'test_api',
        details: { test: true },
        risk_level: 'low'
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ API /api/system/log-activity hoạt động!');
      console.log('   Activity ID:', result.activity_id);
    } else {
      console.error('❌ API trả về lỗi:', result.error);
    }
  } catch (err) {
    console.error('❌ Lỗi khi gọi API:', err.message);
    console.error('   Đảm bảo server đang chạy: npm run dev:https');
  }

  console.log('\n📝 Tóm tắt:');
  console.log('   - Nếu có lỗi về database function hoặc bảng, chạy: npm run setup-db');
  console.log('   - Nếu API không hoạt động, đảm bảo server đang chạy');
  console.log('   - Logging cần được gọi trong các API (upload, chat, etc.)\n');
}

testLogging().catch(console.error);

