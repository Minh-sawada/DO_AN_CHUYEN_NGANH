const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

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

async function setupBackupSystem() {
  console.log('🚀 Bắt đầu setup hệ thống backup...\n');

  try {
    // 1. Đọc và chạy SQL setup
    console.log('1️⃣ Đang setup database...');
    const sqlPath = path.join(__dirname, '..', 'database', 'backup-system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    await supabase.rpc('exec_sql', { sql: sqlContent });
    console.log('✓ Đã tạo database schema');

    // 2. Tạo admin user nếu chưa có
    console.log('\n2️⃣ Đang tạo admin user...');
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'admin@example.com',
      password: 'admin123',
      email_confirm: true
    });

    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: 'Admin User',
          role: 'admin'
        });
      console.log('✓ Đã tạo admin user');
      console.log('  Email: admin@example.com');
      console.log('  Password: admin123');
    }

    // 3. Tạo storage bucket
    console.log('\n3️⃣ Đang tạo storage bucket...');
    await supabase
      .storage
      .createBucket('backups', {
        public: false,
        fileSizeLimit: 104857600
      });
    console.log('✓ Đã tạo storage bucket');

    // 4. Bật auto backup
    console.log('\n4️⃣ Đang cấu hình backup...');
    await supabase
      .from('backup_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000000',
        auto_backup_enabled: true,
        backup_frequency: 'daily',
        retention_days: 30,
        encryption_enabled: true
      });
    console.log('✓ Đã cấu hình backup tự động');

    console.log('\n✅ Setup hoàn tất!');
    console.log('=====================================');
    console.log('Bạn có thể chạy test với lệnh:');
    console.log('npm run test:backup');
    console.log('=====================================');

  } catch (error) {
    console.error('\n❌ Lỗi khi setup:', error.message);
    console.log('\nChi tiết lỗi:', error);
  }
}

// Chạy setup
setupBackupSystem().catch(console.error);