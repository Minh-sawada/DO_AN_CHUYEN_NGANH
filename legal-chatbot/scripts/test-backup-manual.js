// Script để test backup thủ công ngay
// Chạy: node scripts/test-backup-manual.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testManualBackup() {
  console.log('🚀 Bắt đầu test backup thủ công...\n');

  try {
    // 1. Kiểm tra backup settings
    console.log('1️⃣ Kiểm tra cấu hình backup...');
    const { data: settings, error: settingsError } = await supabase
      .from('backup_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.log('❌ Chưa có cấu hình backup. Đang tạo mặc định...');
      const { error: insertError } = await supabase
        .from('backup_settings')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          auto_backup_enabled: true,
          backup_frequency: 'daily',
          retention_days: 30,
          encryption_enabled: true,
          max_backup_size_mb: 50
        });

      if (insertError) {
        throw new Error('Không thể tạo cấu hình: ' + insertError.message);
      }
      console.log('✅ Đã tạo cấu hình backup mặc định');
    } else {
      console.log('✅ Cấu hình backup:', {
        auto_backup_enabled: settings.auto_backup_enabled,
        backup_frequency: settings.backup_frequency,
        retention_days: settings.retention_days
      });
    }

    // 2. Export dữ liệu
    console.log('\n2️⃣ Đang export dữ liệu...');
    const { data: exportedData, error: exportError } = await supabase.rpc('export_backup_data');

    if (exportError) {
      throw new Error('Lỗi export dữ liệu: ' + exportError.message);
    }

    if (!exportedData) {
      throw new Error('Không có dữ liệu để backup');
    }

    const dataSize = JSON.stringify(exportedData).length;
    console.log(`✅ Đã export dữ liệu: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);

    // 3. Kiểm tra kích thước file
    if (dataSize > 50 * 1024 * 1024) {
      console.log('⚠️  Cảnh báo: Backup lớn hơn 50MB, có thể không upload được lên Supabase Storage');
      console.log('💡 Giải pháp: Chia nhỏ hoặc nén file');
    }

    // 4. Tạo backup log
    console.log('\n3️⃣ Đang tạo backup log...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;

    const { data: backupLog, error: logError } = await supabase
      .from('backup_logs')
      .insert({
        backup_type: 'manual',
        file_name: filename,
        file_size: dataSize,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      throw new Error('Lỗi tạo backup log: ' + logError.message);
    }
    console.log('✅ Đã tạo backup log với ID:', backupLog.id);

    // 5. Upload lên Supabase Storage
    console.log('\n4️⃣ Đang upload lên Supabase Storage...');
    const backupData = JSON.stringify(exportedData);
    const blob = new Blob([backupData], { type: 'application/json' });
    
    // Convert Blob to ArrayBuffer for Node.js
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, buffer, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      // Update log với lỗi
      await supabase
        .from('backup_logs')
        .update({
          status: 'failed',
          error_message: uploadError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', backupLog.id);

      throw new Error('Lỗi upload: ' + uploadError.message);
    }

    console.log('✅ Đã upload thành công:', uploadData.path);

    // 6. Cập nhật backup log thành công
    await supabase
      .from('backup_logs')
      .update({
        status: 'success',
        completed_at: new Date().toISOString()
      })
      .eq('id', backupLog.id);

    console.log('\n✅ BACKUP THÀNH CÔNG!');
    console.log('=====================================');
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Kích thước: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📍 Vị trí: Supabase Storage bucket "backups"`);
    console.log('=====================================');
    console.log('\n💡 Bạn có thể xem file trong Supabase Dashboard:');
    console.log('   Storage > Buckets > backups\n');

    // 7. Lưu file backup về local (tùy chọn)
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const localPath = path.join(backupDir, filename);
    fs.writeFileSync(localPath, backupData);
    console.log(`💾 Đã lưu bản sao local: ${localPath}`);

  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error('\n🔍 Nguyên nhân có thể:');
    console.error('   1. Chưa tạo storage bucket "backups"');
    console.error('   2. Chưa setup database schema (chạy database/backup-system.sql)');
    console.error('   3. Service role key không đúng');
    console.error('   4. Backup quá lớn (>50MB)');
    process.exit(1);
  }
}

// Chạy test
testManualBackup();

