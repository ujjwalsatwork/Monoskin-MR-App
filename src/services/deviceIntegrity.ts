import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import * as RNFS from '@dr.pogodin/react-native-fs';

// ─────────────────────────────────────────────────────────────────────────────
// Root / jailbreak detection (MOB-06).
//
// Every other at-rest protection in this app — the OS sandbox, the encrypted
// stores, iOS file protection — assumes the operating system's own guarantees
// hold. On a rooted or jailbroken handset they do not: the sandbox is bypassable,
// the key file is readable, and the app's logic can be rewritten while running.
// The app could not previously tell the difference.
//
// NOTE ON THE ASSESSMENT: the report suggests the bundled device-information
// library already exposes a root/jailbreak signal. It does not —
// react-native-device-info v15 has no such API (its closest calls are
// `isEmulator`, `getTags` and `isPinOrFingerprintSet`). Rather than add a native
// dependency for it, this uses the standard filesystem-probe technique through
// the file module the app already ships. On a healthy handset the sandbox denies
// every one of these paths and each probe returns false; on a compromised one
// they resolve.
//
// This is a heuristic, and it is honest about that: detection is a signal, never
// a guarantee. A determined attacker with a modified OS can hide from any
// in-process check. It raises the cost and, far more usefully, tells Monoskin how
// much of the real field estate is affected.
//
// POLICY — report, do not block. Per the report's own recommendation, a
// compromised device is flagged on every API call via a request header rather
// than being denied access, so the ERP team can size the problem before anyone
// decides to enforce. Nothing here changes what a representative can do today.
// ─────────────────────────────────────────────────────────────────────────────

/** Superuser binaries and root-manager artefacts. Absent inside a clean sandbox. */
const ANDROID_ROOT_PATHS = [
    '/system/app/Superuser.apk',
    '/system/app/SuperSU.apk',
    '/sbin/su',
    '/system/bin/su',
    '/system/xbin/su',
    '/system/sd/xbin/su',
    '/data/local/xbin/su',
    '/data/local/bin/su',
    '/data/local/su',
    '/su/bin/su',
    '/system/xbin/daemonsu',
    '/system/etc/init.d/99SuperSUDaemon',
    '/dev/com.koushikdutta.superuser.daemon/',
    '/system/bin/failsafe/su',
];

/** Cydia/Sileo, MobileSubstrate and the UNIX userland a jailbreak brings with it. */
const IOS_JAILBREAK_PATHS = [
    '/Applications/Cydia.app',
    '/Applications/Sileo.app',
    '/Applications/Zebra.app',
    '/Library/MobileSubstrate/MobileSubstrate.dylib',
    '/Library/MobileSubstrate/DynamicLibraries',
    '/usr/sbin/sshd',
    '/usr/bin/ssh',
    '/usr/libexec/ssh-keysign',
    '/bin/bash',
    '/bin/sh',
    '/etc/apt',
    '/private/var/lib/apt',
    '/private/var/lib/cydia',
    '/private/var/stash',
];

export type IntegrityVerdict = 'ok' | 'compromised' | 'unknown';

export interface DeviceIntegrity {
    verdict: IntegrityVerdict;
    /** Which probes fired. Diagnostic only — never shown to a representative. */
    reasons: string[];
    checkedAt: number;
}

const UNKNOWN: DeviceIntegrity = { verdict: 'unknown', reasons: [], checkedAt: 0 };

let cached: DeviceIntegrity = UNKNOWN;
let running: Promise<DeviceIntegrity> | null = null;

/** `RNFS.exists` rejects rather than returning false on some denied paths. */
const pathExists = async (path: string): Promise<boolean> => {
    try {
        return await RNFS.exists(path);
    } catch {
        return false;
    }
};

const findPresentPaths = async (paths: string[]): Promise<string[]> => {
    const results = await Promise.all(
        paths.map(async path => ((await pathExists(path)) ? path : null)),
    );
    return results.filter((p): p is string => p !== null);
};

/**
 * Writing outside the sandbox is impossible on a healthy device and trivial on a
 * jailbroken one, which makes it the single strongest iOS signal — it does not
 * depend on knowing any particular jailbreak's file layout.
 */
const canEscapeSandbox = async (): Promise<boolean> => {
    const probe = '/private/monoskin_integrity_probe.txt';
    try {
        await RNFS.writeFile(probe, 'probe', 'utf8');
        await RNFS.unlink(probe);
        return true;
    } catch {
        return false;
    }
};

const runChecks = async (): Promise<DeviceIntegrity> => {
    const reasons: string[] = [];

    try {
        if (Platform.OS === 'android') {
            const present = await findPresentPaths(ANDROID_ROOT_PATHS);
            present.forEach(p => reasons.push(`su-path:${p}`));

            // A production Android build is signed with release-keys. `test-keys`
            // means a custom or engineering ROM, which is how most rooted handsets
            // in the field present themselves.
            try {
                const tags = await DeviceInfo.getTags();
                if (typeof tags === 'string' && tags.includes('test-keys')) {
                    reasons.push('build-tags:test-keys');
                }
            } catch {
                // Non-fatal: one missing signal must not fail the whole check.
            }
        } else if (Platform.OS === 'ios') {
            const present = await findPresentPaths(IOS_JAILBREAK_PATHS);
            present.forEach(p => reasons.push(`jb-path:${p}`));

            if (await canEscapeSandbox()) { reasons.push('sandbox-escape'); }
        }
    } catch (err) {
        // A check that cannot run must report 'unknown', never a false 'ok' —
        // 'ok' is a claim, and this module should only make one it has evidence for.
        console.log('🚀 ~ deviceIntegrity ~ check failed:', err);
        return { verdict: 'unknown', reasons: ['check-error'], checkedAt: Date.now() };
    }

    return {
        verdict: reasons.length > 0 ? 'compromised' : 'ok',
        reasons,
        checkedAt: Date.now(),
    };
};

/**
 * Run the integrity check once per app launch and cache the result.
 *
 * Deliberately fire-and-forget from `App.tsx`: nothing waits on it, so a slow
 * filesystem cannot delay the splash screen by even a frame.
 */
export const checkDeviceIntegrity = async (): Promise<DeviceIntegrity> => {
    if (cached.verdict !== 'unknown') { return cached; }
    if (running) { return running; }

    running = runChecks();
    try {
        cached = await running;
        if (cached.verdict === 'compromised') {
            console.log('🚀 ~ deviceIntegrity ~ COMPROMISED DEVICE:', cached.reasons);
        }
        return cached;
    } finally {
        running = null;
    }
};

/** The cached verdict, for synchronous callers such as the request interceptor. */
export const getDeviceIntegrity = (): DeviceIntegrity => cached;
