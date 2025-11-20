const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const selfsigned = require('selfsigned');

// Tìm đường dẫn mkcert
function findMkcertPath() {
  // Thử tìm trong PATH trước
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    return 'mkcert'; // Tìm thấy trong PATH
  } catch {
    // Nếu không có trong PATH, thử tìm trong thư mục tools của project
    const toolsPath = path.join(__dirname, '..', 'tools', 'mkcert.exe');
    if (fs.existsSync(toolsPath)) {
      return toolsPath; // Tìm thấy trong thư mục tools
    }
    return null; // Không tìm thấy
  }
}

// Kiểm tra xem mkcert có sẵn không
function hasMkcert() {
  return findMkcertPath() !== null;
}

// Tạo certificate bằng mkcert (CHUYÊN NGHIỆP - KHÔNG CÓ CẢNH BÁO)
function generateMkcertCert() {
  const certPath = path.join(__dirname, '..', 'localhost+1.pem');
  const keyPath = path.join(__dirname, '..', 'localhost+1-key.pem');

  // Kiểm tra xem đã có certificate chưa
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('✅ Certificate đã tồn tại, bỏ qua tạo mới.');
    return { certPath, keyPath };
  }

  console.log('🔐 Đang tạo certificate bằng mkcert (CHUYÊN NGHIỆP)...');
  console.log('   Certificate này được hệ thống tin cậy - KHÔNG CÓ CẢNH BÁO!\n');

  try {
    // Tìm đường dẫn mkcert
    const mkcertPath = findMkcertPath();
    if (!mkcertPath) {
      throw new Error('Không tìm thấy mkcert. Vui lòng cài đặt mkcert trước.');
    }
    
    // Lấy IP từ env hoặc dùng IP mặc định
    const ip = process.env.SERVER_IP || '10.15.87.114';
    
    // Tạo certificate với mkcert
    const domains = ['localhost', ip, '127.0.0.1'];
    const mkcertCmd = `"${mkcertPath}" -cert-file "${certPath}" -key-file "${keyPath}" ${domains.join(' ')}`;
    
    console.log(`   Đang chạy: ${mkcertCmd}\n`);
    execSync(mkcertCmd, { stdio: 'inherit' });

    console.log('\n✅ Đã tạo certificate thành công bằng mkcert!');
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Private Key: ${keyPath}`);
    console.log('\n✅ Certificate hoạt động với cả:');
    console.log('   - https://localhost:3000');
    console.log(`   - https://${ip}:3000`);
    console.log('\n✅ Certificate được hệ thống tin cậy - KHÔNG CÓ CẢNH BÁO!\n');

    return { certPath, keyPath };
  } catch (error) {
    console.error('❌ Lỗi khi tạo certificate bằng mkcert:', error.message);
    throw error;
  }
}

// Tạo self-signed certificate tự động cho cả localhost và IP (FALLBACK)
function generateSelfSignedCert() {
  const certPath = path.join(__dirname, '..', 'localhost+1.pem');
  const keyPath = path.join(__dirname, '..', 'localhost+1-key.pem');

  // Kiểm tra xem đã có certificate chưa
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('✅ Certificate đã tồn tại, bỏ qua tạo mới.');
    return { certPath, keyPath };
  }

  console.log('🔐 Đang tạo self-signed certificate cho localhost và IP...');
  console.log('   (Không cần cài openssl - tự động tạo bằng Node.js)');
  console.log('   ⚠️  Đây là fallback - nên cài mkcert để có certificate chuyên nghiệp!\n');

  try {
    // Tạo certificate với selfsigned package
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'basicConstraints',
          cA: false,
        },
        {
          name: 'keyUsage',
          keyEncipherment: true,
          digitalSignature: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              type: 2, // DNS
              value: 'localhost',
            },
            {
              type: 2, // DNS
              value: '10.15.87.114',
            },
            {
              type: 7, // IP
              ip: '127.0.0.1',
            },
            {
              type: 7, // IP
              ip: '10.15.87.114',
            },
          ],
        },
      ],
    });

    // Lưu certificate và key
    fs.writeFileSync(certPath, pems.cert);
    fs.writeFileSync(keyPath, pems.private);

    console.log('✅ Đã tạo certificate thành công!');
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Private Key: ${keyPath}`);
    console.log('\n✅ Certificate hoạt động với cả:');
    console.log('   - https://localhost:3000');
    console.log('   - https://10.15.87.114:3000');
    console.log('\n⚠️  Đây là self-signed certificate, trình duyệt sẽ cảnh báo "Not secure"');
    console.log('   Click "Advanced" > "Proceed to localhost" để tiếp tục.\n');

    return { certPath, keyPath };
  } catch (error) {
    console.error('❌ Lỗi khi tạo certificate:', error.message);
    throw error;
  }
}

// Hàm chính: tự động chọn mkcert hoặc self-signed
function generateCert() {
  if (hasMkcert()) {
    console.log('✅ Phát hiện mkcert - sử dụng mkcert để tạo certificate chuyên nghiệp!\n');
    return generateMkcertCert();
  } else {
    console.log('⚠️  Không tìm thấy mkcert - sử dụng self-signed certificate (có cảnh báo)\n');
    console.log('💡 Để có certificate chuyên nghiệp (miễn phí, không cảnh báo):');
    console.log('   1. Cài mkcert: https://github.com/FiloSottile/mkcert');
    console.log('   2. Windows: choco install mkcert hoặc scoop install mkcert');
    console.log('   3. Sau đó chạy: mkcert -install');
    console.log('   4. Chạy lại script này\n');
    return generateSelfSignedCert();
  }
}

// Chạy
if (require.main === module) {
  try {
    generateCert();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

module.exports = { 
  generateCert,
  generateMkcertCert,
  generateSelfSignedCert,
  hasMkcert
};

