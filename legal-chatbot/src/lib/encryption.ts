import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export function encrypt(text: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex')
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

export function encryptFile(buffer: Buffer): { encryptedBuffer: Buffer; iv: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);

  return {
    encryptedBuffer: encrypted,
    iv: iv.toString('hex')
  };
}

export function decryptFile(encrypted: Buffer, iv: string): Buffer {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}