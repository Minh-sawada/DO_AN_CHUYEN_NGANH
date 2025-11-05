const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

// Tạo self-signed certificate tự động cho cả localhost và IP (KHÔNG CẦN OPENSSL)
function generateSelfSignedCert() {
  const certPath = path.join(__dirname, '..', 'localhost+1.pem');
  const keyPath = path.join(__dirname, '..', 'localhost+1-key.pem');

  // Kiểm tra xem đã có certificate chưa
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('✅ Certificate đã tồn tại, bỏ qua tạo mới.');
    return { certPath, keyPath };
  }

  console.log('🔐 Đang tạo self-signed certificate cho localhost và IP...');
  console.log('   (Không cần cài openssl - tự động tạo bằng Node.js)\n');

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

// Chạy
if (require.main === module) {
  try {
    generateSelfSignedCert();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

module.exports = { generateSelfSignedCert };

