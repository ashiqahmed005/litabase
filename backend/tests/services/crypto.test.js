// Set a fixed key before the module loads so the IIFE picks it up
process.env.ENCRYPTION_KEY = 'test-key-exactly-32-chars-xxxxxx';

const { encrypt, decrypt } = require('../../src/services/crypto');

describe('encrypt / decrypt', () => {
  it('round-trips a plaintext string', () => {
    const plain = 'my-secret-password';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('produces different ciphertexts on each call (random IV)', () => {
    const plain = 'same-password';
    expect(encrypt(plain)).not.toBe(encrypt(plain));
  });

  it('stores IV and ciphertext separated by a colon', () => {
    const parts = encrypt('test').split(':');
    expect(parts).toHaveLength(2);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
  });

  it('preserves special characters and unicode', () => {
    const plain = 'pässwörd!@#$%^&*()_+';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('round-trips an empty string', () => {
    expect(decrypt(encrypt(''))).toBe('');
  });

  it('round-trips a long string', () => {
    const plain = 'x'.repeat(1000);
    expect(decrypt(encrypt(plain))).toBe(plain);
  });
});
