/**
 * Cryptographic utilities for Secure Bookmarks.
 *
 * Key derivation : PBKDF2 (SHA-256, 200 000 iterations)
 * Encryption     : AES-256-GCM
 * Storage format : [12-byte IV | ciphertext] stored as a number[]
 */

const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12;   // bytes – 96-bit IV for AES-GCM

/** Generate a cryptographically random salt for a new vault. */
export function generateSalt(): number[] {
  return Array.from(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)));
}

/** Derive an AES-256-GCM CryptoKey from a password and salt. */
async function deriveKey(password: string, saltArray: number[]): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(saltArray), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt arbitrary data (JSON-serialised) with AES-256-GCM.
 * Returns a number[] of the form [IV (12 bytes) | ciphertext].
 */
export async function encryptData(data: unknown, password: string, saltArray: number[]): Promise<number[]> {
  const key = await deriveKey(password, saltArray);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return Array.from(combined);
}

/**
 * Decrypt data previously encrypted with encryptData.
 * Throws DOMException if the password is wrong or data is corrupt.
 */
export async function decryptData<T>(
  encryptedArray: number[],
  password: string,
  saltArray: number[],
): Promise<T> {
  const key = await deriveKey(password, saltArray);
  const bytes = new Uint8Array(encryptedArray);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, IV_LENGTH) },
    key,
    bytes.slice(IV_LENGTH),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

/**
 * Re-encrypt vault data under a new password (verifies old password first).
 * Throws if the old password is wrong.
 */
export async function reEncryptData(
  encryptedArray: number[],
  oldPassword: string,
  newPassword: string,
  saltArray: number[],
): Promise<{ newSalt: number[]; newEncrypted: number[] }> {
  const data = await decryptData(encryptedArray, oldPassword, saltArray);
  const newSalt = generateSalt();
  const newEncrypted = await encryptData(data, newPassword, newSalt);
  return { newSalt, newEncrypted };
}
