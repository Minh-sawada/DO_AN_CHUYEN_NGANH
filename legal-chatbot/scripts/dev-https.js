const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Tìm certificate files
const certPath = path.join(__dirname, '..', 'localhost+1.pem');
const keyPath = path.join(__dirname, '..', 'localhost+1-key.pem');

// Tự động tạo certificate nếu chưa có
function setupHttps() {
  let hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

  if (!hasCert) {
    console.log('\n📝 Không tìm thấy certificate, đang tự động tạo...\n');
    try {
      const { generateSelfSignedCert } = require('./generate-cert');
      generateSelfSignedCert();
      hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);
    } catch (error) {
      console.error('\n❌ Không thể tự động tạo certificate!');
      console.error('\n📝 Cách khác:');
      console.error('1. Dùng localhost:3000 thay vì IP (không cần HTTPS)');
      console.error('2. Hoặc cài mkcert: https://github.com/FiloSottile/mkcert');
      console.error('3. Chạy: mkcert -install && mkcert localhost 10.15.87.114\n');
      process.exit(1);
    }
  }

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  app.prepare().then(() => {
    createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`\n✅ Server đang chạy với HTTPS`);
      console.log(`   Local:   https://${hostname}:${port}`);
      console.log(`   Network: https://10.15.87.114:${port}`);
      console.log(`\n✅ Certificate đã được trust - không có cảnh báo!\n`);
    });
  });
}

setupHttps();

