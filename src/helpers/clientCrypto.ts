// clientCrypto.ts
// Native Web Crypto API wrappers for End-to-End Encryption

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 1. PIN Key Derivation
export async function derivePinKey(pin: string, username: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawPin = encoder.encode(pin);
  
  // Use a user-specific salt to prevent rainbow table attacks
  const salt = encoder.encode(username.toLowerCase() + "-veil-salt-v1");
  
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    rawPin,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// 2. RSA Keypair Generation
export interface RSAKeyPair {
  publicKeyJwk: string;
  privateKey: CryptoKey;
}

export async function generateRSAKeyPair(): Promise<RSAKeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true, // Extractable so we can export & backup
    ["encrypt", "decrypt"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    publicKeyJwk: JSON.stringify(publicKeyJwk),
    privateKey: keyPair.privateKey
  };
}

// 3. Encrypt and Decrypt RSA Private Key with Chat PIN key
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  pinKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  const privateKeyString = JSON.stringify(privateKeyJwk);
  const encoder = new TextEncoder();
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    pinKey,
    encoder.encode(privateKeyString)
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer)
  };
}

export async function decryptPrivateKey(
  ciphertext: string,
  iv: string,
  pinKey: CryptoKey
): Promise<CryptoKey> {
  const ciphertextBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(ivBuffer)
    },
    pinKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  const privateKeyJwkStr = decoder.decode(decryptedBuffer);
  const privateKeyJwk = JSON.parse(privateKeyJwkStr);

  return await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["decrypt"]
  );
}

// 4. Import Keys from String representations
export async function importPublicKey(publicKeyJwkStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(publicKeyJwkStr);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["encrypt"]
  );
}

export async function importPrivateKey(privateKeyJwkStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(privateKeyJwkStr);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["decrypt"]
  );
}

// 5. Room AES Key Generation and RSA Wrappers
export async function generateAESRoomKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptRoomKey(aesKey: CryptoKey, rsaPublicKey: CryptoKey): Promise<string> {
  const aesKeyJwk = await window.crypto.subtle.exportKey("jwk", aesKey);
  const aesKeyJwkStr = JSON.stringify(aesKeyJwk);
  const encoder = new TextEncoder();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    rsaPublicKey,
    encoder.encode(aesKeyJwkStr)
  );

  return bufferToBase64(encryptedBuffer);
}

export async function decryptRoomKey(encryptedKeyBase64: string, rsaPrivateKey: CryptoKey): Promise<CryptoKey> {
  const encryptedBuffer = base64ToBuffer(encryptedKeyBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    rsaPrivateKey,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  const aesKeyJwkStr = decoder.decode(decryptedBuffer);
  const aesKeyJwk = JSON.parse(aesKeyJwkStr);

  return await window.crypto.subtle.importKey(
    "jwk",
    aesKeyJwk,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// 6. Message Encryption and Decryption
export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

export async function encryptMessage(aesKey: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    aesKey,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer)
  };
}

export async function decryptMessage(
  aesKey: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(ivBuffer)
    },
    aesKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
