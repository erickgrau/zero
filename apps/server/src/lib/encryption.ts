import { env } from '../env';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// The text encoding/decoding API
const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * Derives a cryptographic key from the secret string (BETTER_AUTH_SECRET).
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    // If no secret is configured, just use a dummy fallback. In production this shouldn't happen.
    const password = env.BETTER_AUTH_SECRET || 'fallback_dev_secret_do_not_use';

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a plaintext string and returns a base64 encoded payload
 * Format: base64(salt + iv + ciphertext)
 */
export async function encryptText(text: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await deriveKey(salt);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        enc.encode(text)
    );

    // Pack salt, iv, and ciphertext into one buffer
    const payload = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for easy database storage
    return btoa(String.fromCharCode.apply(null, Array.from(payload)));
}

/**
 * Decrypts a base64 encoded payload back to the plaintext string
 */
export async function decryptText(encryptedBase64: string): Promise<string> {
    try {
        const payload = new Uint8Array(
            atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
        );

        const salt = payload.slice(0, SALT_LENGTH);
        const iv = payload.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const ciphertext = payload.slice(SALT_LENGTH + IV_LENGTH);

        const key = await deriveKey(salt);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv,
            },
            key,
            ciphertext
        );

        return dec.decode(decrypted);
    } catch (error) {
        console.error('Failed to decrypt text:', error);
        throw new Error('Decryption failed. The secret key may have changed or data is corrupted.');
    }
}
