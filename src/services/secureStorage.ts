// Polyfills `global.crypto.getRandomValues` with the platform CSPRNG
// (SecRandomCopyBytes on iOS, java.security.SecureRandom on Android). MUST be
// imported before crypto-js, which reads `global.crypto` once at module load and
// throws rather than falling back to Math.random if it is absent.
import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';

// ─────────────────────────────────────────────────────────────────────────────
// Encrypted at-rest layer for the three local stores (MOB-03).
//
// AsyncStorage is a plain SQLite table on Android and a plain file in the app
// container on iOS — protected only by the OS sandbox, which a rooted, jailbroken
// or forensically imaged handset defeats. Everything written through this module
// is AES-256-CBC encrypted with a random per-install key and authenticated with
// HMAC-SHA256, so the stored bytes are meaningless without the key file.
//
// WHERE THE KEY LIVES
//   iOS      Library/.monoskin-secure/  — created with NSURLIsExcludedFromBackupKey
//            so the key is NEVER copied into iCloud or an encrypted device backup,
//            and NSFileProtectionComplete so it is unreadable while the handset is
//            locked. This is also what neutralises MOB-04: even though iOS sweeps
//            the AsyncStorage container into the backup, the ciphertext there is
//            useless because the key is excluded.
//   Android  the app's private internal files dir (/data/data/<pkg>/files), which
//            `android:allowBackup="false"` already keeps out of Google Drive and
//            adb backup.
//
// HONEST LIMITATION: the key is held in a protected file, not in the Android
// Keystore / iOS Keychain. On iOS, file protection is hardware-backed and the
// difference is small. On Android, a rooted device can still read the file. Moving
// the key into the Keystore needs a native module (react-native-keychain), which
// was deliberately not added here — see docs/SECURITY_REMEDIATION.md.
//
// FAILURE POLICY: this module never destroys data it cannot read. A key that
// exists but cannot be loaded makes reads return null and writes no-op, so the
// ciphertext survives on disk and recovers on the next launch. It must never
// silently mint a second key over a live one.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_DIR_NAME = '.monoskin-secure';
const KEY_FILE_NAME = 'store.key';

/** Envelope marker. A value not starting with this is legacy plaintext. */
const ENVELOPE_PREFIX = 'msk1:';

/** iOS: unreadable while the device is locked. Ignored on Android. */
const IOS_FILE_PROTECTION = 'NSFileProtectionComplete';

const keyDir = (): string => {
    // LibraryDirectoryPath is iOS-only and typed `string | undefined`; Documents
    // maps to the private internal files dir on Android.
    const base =
        Platform.OS === 'ios'
            ? RNFS.LibraryDirectoryPath ?? RNFS.DocumentDirectoryPath
            : RNFS.DocumentDirectoryPath;
    return `${base}/${KEY_DIR_NAME}`;
};

const keyPath = (): string => `${keyDir()}/${KEY_FILE_NAME}`;

/** Raised when a key is known to exist but could not be read. Never regenerate. */
class KeyUnavailableError extends Error {
    constructor(cause: unknown) {
        super(`Secure store key could not be read: ${String(cause)}`);
        this.name = 'KeyUnavailableError';
    }
}

interface KeyPair {
    /** AES-256 key. */
    enc: CryptoJS.lib.WordArray;
    /** Separate HMAC key, derived from the master so only one secret is stored. */
    mac: CryptoJS.lib.WordArray;
}

let cached: KeyPair | null = null;
let loading: Promise<KeyPair> | null = null;

const deriveKeys = (masterB64: string): KeyPair => {
    const master = CryptoJS.enc.Base64.parse(masterB64);
    return {
        // Domain-separated so the cipher key and the MAC key are never the same
        // bytes, which is what lets encrypt-then-MAC be analysed independently.
        enc: CryptoJS.HmacSHA256('monoskin/enc/v1', master),
        mac: CryptoJS.HmacSHA256('monoskin/mac/v1', master),
    };
};

const loadOrCreateKey = async (): Promise<KeyPair> => {
    if (cached) { return cached; }
    if (loading) { return loading; }

    loading = (async (): Promise<KeyPair> => {
        const dir = keyDir();
        const file = keyPath();

        let fileExists = false;
        try {
            fileExists = await RNFS.exists(file);
        } catch (err) {
            // Cannot even tell whether a key exists — refuse to mint one, because
            // overwriting a live key would orphan every stored record.
            throw new KeyUnavailableError(err);
        }

        if (fileExists) {
            try {
                const stored = (await RNFS.readFile(file, 'utf8')).trim();
                if (!stored) { throw new Error('empty key file'); }
                const pair = deriveKeys(stored);
                cached = pair;
                return pair;
            } catch (err) {
                throw new KeyUnavailableError(err);
            }
        }

        // First run on this install: mint a 256-bit key from the platform CSPRNG.
        const masterB64 = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(32));

        // `mkdir` is idempotent. The iOS-only options are what keep the key out of
        // iCloud and unreadable on a locked handset; they are ignored on Android.
        await RNFS.mkdir(dir, {
            NSURLIsExcludedFromBackupKey: true,
            NSFileProtectionKey: IOS_FILE_PROTECTION,
        });
        await RNFS.writeFile(file, masterB64, {
            encoding: 'utf8',
            NSFileProtectionKey: IOS_FILE_PROTECTION,
        });

        const pair = deriveKeys(masterB64);
        cached = pair;
        return pair;
    })();

    try {
        return await loading;
    } finally {
        loading = null;
    }
};

// ─── Envelope ────────────────────────────────────────────────────────────────
// msk1:<ivB64>:<ciphertextB64>:<macB64>
//
// Encrypt-then-MAC: the MAC covers the version, the IV and the ciphertext, so a
// tampered or truncated record is rejected before any decryption is attempted.

const macOf = (iv: string, ct: string, key: CryptoJS.lib.WordArray): string =>
    CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${ENVELOPE_PREFIX}${iv}:${ct}`, key));

const seal = (plaintext: string, keys: KeyPair): string => {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, keys.enc, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    const ivB64 = CryptoJS.enc.Base64.stringify(iv);
    const ctB64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    return `${ENVELOPE_PREFIX}${ivB64}:${ctB64}:${macOf(ivB64, ctB64, keys.mac)}`;
};

const open = (envelope: string, keys: KeyPair): string | null => {
    const body = envelope.slice(ENVELOPE_PREFIX.length);
    const parts = body.split(':');
    if (parts.length !== 3) { return null; }
    const [ivB64, ctB64, macB64] = parts;

    // Reject anything whose MAC does not match before touching the cipher.
    if (macOf(ivB64, ctB64, keys.mac) !== macB64) {
        console.log('🚀 ~ secureStorage ~ MAC mismatch, refusing to decrypt');
        return null;
    }

    const decrypted = CryptoJS.AES.decrypt(
        // @ts-expect-error crypto-js accepts this params shape at runtime
        { ciphertext: CryptoJS.enc.Base64.parse(ctB64) },
        keys.enc,
        { iv: CryptoJS.enc.Base64.parse(ivB64), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    );
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text.length > 0 ? text : null;
};

export const isEnvelope = (raw: string): boolean => raw.startsWith(ENVELOPE_PREFIX);

// ─── Public API ──────────────────────────────────────────────────────────────
// Drop-in replacements for the three AsyncStorage calls the stores actually use.
// Every failure is swallowed the same way the plaintext layer swallowed its own —
// losing crash-recovery is bad, blocking the MR mid-form is worse.

/**
 * Read and decrypt one key.
 *
 * Transparently upgrades a value written by an older build: plaintext is returned
 * as-is and re-written encrypted in the background, so an MR carrying queued leads
 * through this release keeps every one of them.
 */
export const getSecureItem = async (key: string): Promise<string | null> => {
    let raw: string | null;
    try {
        raw = await AsyncStorage.getItem(key);
    } catch (err) {
        console.log('🚀 ~ getSecureItem ~ read error:', err);
        return null;
    }
    if (raw == null) { return null; }

    if (!isEnvelope(raw)) {
        // Legacy plaintext from a pre-encryption build. Hand it back, then upgrade
        // it in place — deliberately not awaited so a slow write never delays a read.
        migrateLegacyValue(key, raw);
        return raw;
    }

    try {
        const keys = await loadOrCreateKey();
        return open(raw, keys);
    } catch (err) {
        // KeyUnavailable, or a corrupt envelope. The ciphertext stays on disk.
        console.log('🚀 ~ getSecureItem ~ decrypt failed:', err);
        return null;
    }
};

/** Encrypt and store one key. No-ops (leaving the previous value intact) on failure. */
export const setSecureItem = async (key: string, value: string): Promise<void> => {
    try {
        const keys = await loadOrCreateKey();
        await AsyncStorage.setItem(key, seal(value, keys));
    } catch (err) {
        console.log('🚀 ~ setSecureItem ~ error:', err);
    }
};

export const removeSecureItem = async (key: string): Promise<void> => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (err) {
        console.log('🚀 ~ removeSecureItem ~ error:', err);
    }
};

const migrateLegacyValue = async (key: string, plaintext: string): Promise<void> => {
    try {
        const keys = await loadOrCreateKey();
        const current = await AsyncStorage.getItem(key);
        // Only rewrite if nothing else has touched the key since the read above.
        if (current !== plaintext) { return; }
        await AsyncStorage.setItem(key, seal(plaintext, keys));
        console.log('🚀 ~ secureStorage ~ migrated to encrypted:', key);
    } catch (err) {
        console.log('🚀 ~ secureStorage ~ migration skipped:', key, err);
    }
};

/**
 * Wipe every encrypted store and the key itself.
 *
 * Backs the explicit "Clear local data" action used when a handset is reassigned
 * (MOB-09). Dropping the key alongside the records means anything that survives
 * deletion in free space is undecryptable.
 */
export const destroySecureStores = async (keys: string[]): Promise<void> => {
    for (const key of keys) {
        await removeSecureItem(key);
    }
    cached = null;
    try {
        if (await RNFS.exists(keyPath())) { await RNFS.unlink(keyPath()); }
    } catch (err) {
        console.log('🚀 ~ destroySecureStores ~ key removal failed:', err);
    }
};
