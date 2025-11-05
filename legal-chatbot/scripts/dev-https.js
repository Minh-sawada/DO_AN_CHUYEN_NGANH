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

// Kiểm tra xem có certificate không
const hasCert = fs.existsSync(certPath) && fs.existsSync(keyPath);

if (!hasCert) {
  console.error('\n❌ Không tìm thấy certificate!');
  console.error('\n📝 Hướng dẫn tạo certificate:');
  console.error('1. Cài đặt mkcert: https://github.com/FiloSottile/mkcert');
  console.error('2. Chạy: mkcert -install');
  console.error('3. Chạy: mkcert localhost 10.15.87.114');
  console.error('4. Copy 2 file .pem vào thư mục legal-chatbot/');
  console.error('\n💡 Hoặc dùng localhost:3000 thay vì IP để dễ cấp quyền hơn\n');
  process.exit(1);
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
    console.log(`\n⚠️  Lần đầu tiên sẽ có cảnh báo "Not secure" - click "Advanced" > "Proceed" để tiếp tục\n`);
  });
});

