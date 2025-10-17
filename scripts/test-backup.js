const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Kiểm tra biến môi trường
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Thiếu biến môi trường: ${envVar}`);
    console.log('\nHãy thêm các biến môi trường sau vào file .env.local:');
    console.log(`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    `);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      return false; // Bảng không tồn tại
    }
    return true; // Bảng tồn tại
  } catch (err) {
    return false;
  }
}

async function testBackupSystem() {
  console.log('🔍 Bắt đầu kiểm tra hệ thống backup...\n');

  try {
    // 1. Kiểm tra các bảng
    console.log('1️⃣ Kiểm tra cấu trúc database:');
    const tables = ['backup_logs', 'backup_settings', 'backup_files'];
    const existingTables = [];
    const missingTables = [];

    for (const table of tables) {
      const exists = await checkTable(table);
      if (exists) {
        existingTables.push(table);
      } else {
        missingTables.push(table);
      }
    }

    if (existingTables.length > 0) {
      console.log('✓ Các bảng đã tạo:', existingTables.join(', '));
    }
    
    if (missingTables.length > 0) {
      console.log('❌ Các bảng chưa tạo:', missingTables.join(', '));
      throw new Error('Một số bảng chưa được tạo. Hãy chạy setup trước!');
    }

    // 2. Kiểm tra cấu hình backup
    console.log('\n2️⃣ Kiểm tra cấu hình backup:');
    const { data: settings, error: settingsError } = await supabase
      .from('backup_settings')
      .select('*')
      .single();
    
    if (settingsError) {
      throw new Error('Không thể đọc cấu hình backup: ' + settingsError.message);
    }
    
    console.log('✓ Auto backup:', settings.auto_backup_enabled ? 'Đã bật' : 'Chưa bật');
    console.log('✓ Tần suất:', settings.backup_frequency);
    console.log('✓ Thời gian lưu trữ:', settings.retention_days, 'ngày');
    console.log('✓ Mã hóa:', settings.encryption_enabled ? 'Đã bật' : 'Chưa bật');

    // 3. Kiểm tra admin user
    console.log('\n3️⃣ Kiểm tra tài khoản admin:');
    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .single();

    if (adminError || !adminUser) {
      console.log('❌ Không tìm thấy tài khoản admin');
      console.log('ℹ️ Hãy chạy setup để tạo tài khoản admin');
      return;
    }
    console.log('✓ Tìm thấy tài khoản admin');

    // 4. Kiểm tra storage bucket
    console.log('\n4️⃣ Kiểm tra storage bucket:');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      throw new Error('Không thể kiểm tra storage: ' + bucketError.message);
    }

    const backupBucket = buckets.find(b => b.name === 'backups');
    if (!backupBucket) {
      console.log('❌ Chưa tạo storage bucket cho backups');
      console.log('ℹ️ Hãy chạy setup để tạo storage bucket');
      return;
    }
    console.log('✓ Storage bucket đã sẵn sàng');

    // 5. Test tạo backup
    console.log('\n5️⃣ Test tạo backup:');
    const { data: newBackup, error: backupError } = await supabase.rpc('create_backup', {
      p_backup_type: 'manual', // Must be one of: 'manual', 'scheduled', 'auto'
      p_created_by: adminUser.id
    });

    if (backupError) {
      throw new Error('Không thể tạo backup: ' + backupError.message);
    }
    console.log('✓ Đã tạo backup mới với ID:', newBackup);

    console.log('\n✅ Kiểm tra hoàn tất!');
    console.log('=====================================');
    console.log('Kết quả: Hệ thống backup hoạt động tốt');
    console.log('=====================================');

  } catch (error) {
    console.error('\n❌ Lỗi khi kiểm tra:', error.message);
    if (error.message.includes('chưa được tạo')) {
      console.log('\nℹ️ Hãy chạy lệnh sau để setup:');
      console.log('npm run setup:backup');
    }
  }
}

// Chạy test
testBackupSystem();