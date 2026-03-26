const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// AES-256 requires exactly 32 bytes — pad or truncate whatever is provided
const KEY = (() => {
  const buf = Buffer.alloc(32);
  Buffer.from(process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-xxxxxxxxxx', 'utf8').copy(buf);
  return buf;
})();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
