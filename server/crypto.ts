import crypto from 'crypto';

// Master key derived from environment or persistent secret
const DEFAULT_SALT = 'youtube-agent-salt-2026';
const RAW_KEY = process.env.ENCRYPTION_KEY || 'youtube-ai-agent-secure-master-key-32b';

function getKey(): Buffer {
  return crypto.scryptSync(RAW_KEY, DEFAULT_SALT, 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string formatted as iv:authTag:ciphertext.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Legacy fallback or unencrypted
      return encryptedText;
    }
    const [ivHex, tagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('Decryption notice:', err);
    return '';
  }
}
