// Regression cover for the fixes made against the September 2026 mobile
// application security assessment. Each block names the finding it defends, so a
// later refactor that reopens one fails here rather than in the next audit.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from '@dr.pogodin/react-native-fs';

import { isMedicalRepresentative, MR_ROLE } from '../src/constants/roles';
import { safeAssetFileName, safeFileSegment } from '../src/utils/sanitize';
import {
  toDialableNumber,
  toValidEmail,
  toWhatsAppNumber,
} from '../src/utils/externalLinks';
import {
  getSecureItem,
  isEnvelope,
  removeSecureItem,
  setSecureItem,
} from '../src/services/secureStorage';

const rawStore = (AsyncStorage as any).__store as Map<string, string>;
const mockFiles = (RNFS as any).__files as Map<string, string>;

beforeEach(() => {
  rawStore.clear();
});

// ─── MOB-01 · role enforcement ───────────────────────────────────────────────

describe('MOB-01 — role gate', () => {
  it('admits the medical representative role', () => {
    expect(isMedicalRepresentative(MR_ROLE)).toBe(true);
  });

  it('tolerates casing and stray whitespace from an ERP seed', () => {
    expect(isMedicalRepresentative('  medical representative ')).toBe(true);
    expect(isMedicalRepresentative('MEDICAL REPRESENTATIVE')).toBe(true);
  });

  it('refuses every other role, including the ones that could reach the app before', () => {
    for (const role of ['Admin', 'Warehouse Manager', 'Finance', 'Area Sales Manager', 'Doctor']) {
      expect(isMedicalRepresentative(role)).toBe(false);
    }
  });

  it('refuses a missing, empty or non-string role rather than defaulting open', () => {
    expect(isMedicalRepresentative(undefined)).toBe(false);
    expect(isMedicalRepresentative(null)).toBe(false);
    expect(isMedicalRepresentative('')).toBe(false);
    expect(isMedicalRepresentative(true)).toBe(false);
    expect(isMedicalRepresentative({ role: MR_ROLE })).toBe(false);
  });

  it('does not match on a prefix or a superset role name', () => {
    expect(isMedicalRepresentative('Medical Representative Manager')).toBe(false);
    expect(isMedicalRepresentative('Senior Medical Representative')).toBe(false);
    expect(isMedicalRepresentative('Medical')).toBe(false);
  });
});

// ─── MOB-03 · encryption at rest ─────────────────────────────────────────────

describe('MOB-03 — encrypted local storage', () => {
  const KEY = '@monoskin/test_store';

  const LEAD = JSON.stringify([{
    mrId: 42,
    displayName: 'Dr. Ramesh Iyer',
    payload: {
      phone: '+919812345678',
      gst: '27AAPFU0939F1ZV',
      drugLicence: 'MH-21B-123456',
    },
  }]);

  it('round-trips a lead payload unchanged', async () => {
    await setSecureItem(KEY, LEAD);
    expect(await getSecureItem(KEY)).toBe(LEAD);
  });

  it('leaves no readable customer data in AsyncStorage', async () => {
    await setSecureItem(KEY, LEAD);
    const atRest = rawStore.get(KEY)!;

    expect(isEnvelope(atRest)).toBe(true);
    // The things that made this a HIGH finding: names, numbers, licence details.
    expect(atRest).not.toContain('Ramesh');
    expect(atRest).not.toContain('9812345678');
    expect(atRest).not.toContain('27AAPFU0939F1ZV');
    expect(atRest).not.toContain('MH-21B-123456');
  });

  it('produces a different ciphertext each write, so records cannot be correlated', async () => {
    await setSecureItem(KEY, LEAD);
    const first = rawStore.get(KEY);
    await setSecureItem(KEY, LEAD);
    expect(rawStore.get(KEY)).not.toBe(first);
  });

  it('refuses a record whose ciphertext has been edited on disk', async () => {
    await setSecureItem(KEY, LEAD);
    const [prefix, iv, ct, mac] = rawStore.get(KEY)!.split(':');
    const flipped = ct.slice(0, 4) + (ct[4] === 'A' ? 'B' : 'A') + ct.slice(5);
    rawStore.set(KEY, [prefix, iv, flipped, mac].join(':'));

    expect(await getSecureItem(KEY)).toBeNull();
  });

  it('refuses a record whose MAC has been stripped', async () => {
    await setSecureItem(KEY, LEAD);
    const [prefix, iv, ct] = rawStore.get(KEY)!.split(':');
    rawStore.set(KEY, [prefix, iv, ct, ''].join(':'));

    expect(await getSecureItem(KEY)).toBeNull();
  });

  it('reads back drafts written by a pre-encryption build, then upgrades them', async () => {
    // The upgrade path that keeps an MR's queued leads through this release.
    rawStore.set(KEY, LEAD);

    expect(await getSecureItem(KEY)).toBe(LEAD);

    // Migration is deliberately not awaited by the read, so let it settle.
    await new Promise<void>(resolve => { setImmediate(() => resolve()); });
    expect(isEnvelope(rawStore.get(KEY)!)).toBe(true);
    expect(await getSecureItem(KEY)).toBe(LEAD);
  });

  it('returns null rather than throwing for a key that was never written', async () => {
    expect(await getSecureItem('@monoskin/never_written')).toBeNull();
  });

  it('removes a record on request', async () => {
    await setSecureItem(KEY, LEAD);
    await removeSecureItem(KEY);
    expect(await getSecureItem(KEY)).toBeNull();
  });

  it('stores the key outside the iCloud-backed container and marks it excluded', async () => {
    await setSecureItem(KEY, LEAD);

    const keyFile = [...mockFiles.keys()].find(p => p.includes('.monoskin-secure'));
    expect(keyFile).toBeDefined();

    // MOB-04 leans on this: the AsyncStorage container is swept into the backup,
    // so the key must not be.
    expect(RNFS.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('.monoskin-secure'),
      expect.objectContaining({ NSURLIsExcludedFromBackupKey: true }),
    );
  });
});

// ─── MOB-07 · path injection ─────────────────────────────────────────────────

describe('MOB-07 — asset filename sanitisation', () => {
  it('neutralises directory traversal in an asset title', () => {
    const name = safeAssetFileName('../../../../etc/passwd', 9, 'PDF');
    expect(name).not.toContain('..');
    expect(name).not.toContain('/');
    expect(name).toBe('etc_passwd_9.pdf');
  });

  it('strips every separator form, not just forward slashes', () => {
    const NUL = String.fromCharCode(0);
    const separators = new RegExp('[/\\\\:|' + NUL + ']');

    for (const title of ['a/b', 'a\\b', `a${NUL}b`, 'a:b', 'a|b']) {
      expect(safeFileSegment(title)).not.toMatch(separators);
    }
  });

  it('refuses to produce a hidden dotfile', () => {
    expect(safeFileSegment('.htaccess').startsWith('.')).toBe(false);
    expect(safeFileSegment('...').length).toBeGreaterThan(0);
  });

  it('never returns an empty name', () => {
    expect(safeFileSegment('').length).toBeGreaterThan(0);
    expect(safeFileSegment('///').length).toBeGreaterThan(0);
    expect(safeFileSegment(null).length).toBeGreaterThan(0);
    expect(safeFileSegment(undefined).length).toBeGreaterThan(0);
  });

  it('caps the length so a long title cannot break the filesystem', () => {
    expect(safeFileSegment('x'.repeat(5000)).length).toBeLessThanOrEqual(80);
  });

  it('sanitises the extension as well, since fileType also comes from the server', () => {
    expect(safeAssetFileName('Brochure', 3, '../sh')).toBe('Brochure_3.sh');
    expect(safeAssetFileName('Brochure', 3, '')).toBe('Brochure_3.bin');
  });

  it('keeps an ordinary title readable', () => {
    expect(safeAssetFileName('Monocure Product Guide 2026', 12, 'PDF'))
      .toBe('Monocure_Product_Guide_2026_12.pdf');
  });
});

// ─── MOB-08 · URL scheme injection ───────────────────────────────────────────

describe('MOB-08 — external link validation', () => {
  it('accepts the phone formats the ERP actually stores', () => {
    expect(toDialableNumber('+919812345678')).toBe('+919812345678');
    expect(toDialableNumber('9812345678')).toBe('9812345678');
    expect(toDialableNumber('+91 98123 45678')).toBe('+919812345678');
    expect(toDialableNumber('(022) 2456-7890')).toBe('02224567890');
  });

  it('refuses a stored value carrying a second scheme', () => {
    // The exact shape of the finding: a "phone" field that is not a phone number.
    expect(toDialableNumber('tel:123#&url=https://evil.example')).toBeNull();
    // eslint-disable-next-line no-script-url -- this is the hostile input
    expect(toDialableNumber('javascript:alert(1)')).toBeNull();
    expect(toDialableNumber('https://evil.example')).toBeNull();
  });

  it('drops DTMF and pause characters that can dial on past the number', () => {
    expect(toDialableNumber('9812345678,,,#')).toBe('9812345678');
    expect(toDialableNumber('98123 45678 ext. 12')).toBe('981234567812');
    // Whatever survives stripping is still held to dialable length, so a padded
    // value cannot slip through as a "number".
    expect(toDialableNumber('9812345678,,,*21*1234#')).toBeNull();
  });

  it('refuses numbers outside dialable length', () => {
    expect(toDialableNumber('123')).toBeNull();
    expect(toDialableNumber('1'.repeat(30))).toBeNull();
    expect(toDialableNumber('')).toBeNull();
    expect(toDialableNumber(null)).toBeNull();
  });

  it('strips the plus for WhatsApp, which rejects it', () => {
    expect(toWhatsAppNumber('+919812345678')).toBe('919812345678');
  });

  it('accepts real addresses and refuses smuggled ones', () => {
    expect(toValidEmail('ramesh.iyer@monoskin.in')).toBe('ramesh.iyer@monoskin.in');
    expect(toValidEmail('a@b.co')).toBe('a@b.co');

    expect(toValidEmail('a@b.co?attach=/etc/passwd')).toBeNull();
    expect(toValidEmail('a@b.co&body=x')).toBeNull();
    expect(toValidEmail('no-at-sign')).toBeNull();
    expect(toValidEmail('a@b')).toBeNull();
    expect(toValidEmail(`${'x'.repeat(300)}@b.co`)).toBeNull();
    expect(toValidEmail(null)).toBeNull();
  });
});
