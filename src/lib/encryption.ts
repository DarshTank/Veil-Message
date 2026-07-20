import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const IV_LENGTH = 16;
const ALGO = "aes-256-cbc";

/**
 * Validates that the encryption key is present and correct length.
 * AES-256 requires a 32-byte key. We accept it as a 64-char hex string.
 */
function getKeyBuffer(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns a string in the format: <iv_hex>:<encrypted_hex>
 * A unique IV is generated for every encryption call.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, getKeyBuffer(), iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a string that was encrypted with encrypt().
 * Expects the format: <iv_hex>:<encrypted_hex>
 * Returns the original plaintext.
 */
export function decrypt(text: string): string {
  if (!text) return "";
  // If the string doesn't match our format, return it as-is (handles legacy plaintext data)
  if (!text.includes(":")) return text;
  try {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGO, getKeyBuffer(), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (err) {
    // If decryption fails (e.g. legacy plaintext stored), return the raw value
    console.warn("Decryption failed, returning raw value:", err);
    return text;
  }
}

/**
 * Creates a SHA-256 hash of a string for use as a DB lookup key.
 * This is one-way (no decryption). Used for email lookups.
 */
export function hashForLookup(text: string): string {
  if (!text) return "";
  return crypto
    .createHash("sha256")
    .update(text.toLowerCase().trim())
    .digest("hex");
}

/**
 * Safely decrypts an array of strings (e.g. ghostReplies).
 */
export function decryptArray(arr: string[]): string[] {
  if (!arr || arr.length === 0) return [];
  return arr.map((item) => decrypt(item));
}

/**
 * Encrypts an array of strings.
 */
export function encryptArray(arr: string[]): string[] {
  if (!arr || arr.length === 0) return [];
  return arr.map((item) => encrypt(item));
}
