const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Hướng dẫn cài đặt mkcert (MIỄN PHÍ - Certificate chuyên nghiệp)\n');

// Kiểm tra xem mkcert đã cài chưa
function checkMkcert() {
  try {
    const version = execSync('mkcert -version', { encoding: 'utf-8' });
    console.log('✅ mkcert đã được cài đặt!');
    console.log(`   Version: ${version.trim()}\n`);
    
    // Kiểm tra xem đã install CA chưa
    try {
      execSync('mkcert -CAROOT', { stdio: 'ignore' });
      console.log('✅ mkcert CA đã được cài đặt vào hệ thống!\n');
      return true;
    } catch {
      console.log('⚠️  mkcert CA chưa được cài đặt vào hệ thống.');
      console.log('   Chạy lệnh: mkcert -install\n');
      return false;
    }
  } catch {
    console.log('❌ mkcert chưa được cài đặt.\n');
    return false;
  }
}

// Hướng dẫn cài đặt
function showInstallInstructions() {
  console.log('📝 HƯỚNG DẪN CÀI ĐẶT MKCERT:\n');
  
  const platform = process.platform;
  
  if (platform === 'win32') {
    console.log('Windows:\n');
    console.log('1. Cài đặt bằng Chocolatey:');
    console.log('   choco install mkcert\n');
    console.log('2. Hoặc cài đặt bằng Scoop:');
    console.log('   scoop install mkcert\n');
    console.log('3. Hoặc tải từ GitHub:');
    console.log('   https://github.com/FiloSottile/mkcert/releases\n');
    console.log('4. Sau khi cài xong, chạy:');
    console.log('   mkcert -install\n');
    console.log('5. Sau đó chạy lại:');
    console.log('   npm run generate-cert\n');
  } else if (platform === 'darwin') {
    console.log('macOS:\n');
    console.log('1. Cài đặt bằng Homebrew:');
    console.log('   brew install mkcert\n');
    console.log('2. Sau khi cài xong, chạy:');
    console.log('   mkcert -install\n');
    console.log('3. Sau đó chạy lại:');
    console.log('   npm run generate-cert\n');
  } else {
    console.log('Linux:\n');
    console.log('1. Cài đặt bằng package manager hoặc tải từ GitHub:');
    console.log('   https://github.com/FiloSottile/mkcert/releases\n');
    console.log('2. Sau khi cài xong, chạy:');
    console.log('   mkcert -install\n');
    console.log('3. Sau đó chạy lại:');
    console.log('   npm run generate-cert\n');
  }
  
  console.log('\n💡 LỢI ÍCH CỦA MKCERT:');
  console.log('   ✅ Miễn phí 100%');
  console.log('   ✅ Certificate được hệ thống tin cậy');
  console.log('   ✅ KHÔNG CÓ cảnh báo "Not secure" trong trình duyệt');
  console.log('   ✅ Hoạt động với cả localhost và IP');
  console.log('   ✅ Chuyên nghiệp như certificate thật\n');
}

// Main
if (require.main === module) {
  const hasMkcert = checkMkcert();
  
  if (!hasMkcert) {
    showInstallInstructions();
  } else {
    console.log('✅ Bạn đã sẵn sàng! Chạy: npm run generate-cert\n');
  }
}

module.exports = { checkMkcert, showInstallInstructions };

