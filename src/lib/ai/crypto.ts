import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = process.env.AGENCY_SECRETS_KEY?.trim();
  if (!raw) {
    throw new Error('AGENCY_SECRETS_KEY is required for agency secret encryption.');
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `AGENCY_SECRETS_KEY must be ${KEY_LENGTH} bytes hex-encoded (got ${key.length}).`
    );
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new Error('encryptToken: plaintext is required.');
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
}

export function decryptToken(payload: string): string {
  if (!payload) {
    throw new Error('decryptToken: payload is required.');
  }
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('decryptToken: payload must be `iv:ciphertext:authTag` hex format.');
  }
  const [ivHex, ciphertextHex, authTagHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
