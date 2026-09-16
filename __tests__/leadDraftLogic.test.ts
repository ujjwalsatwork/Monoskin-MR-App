// AsyncStorage ships ESM only, which this preset does not transform. These tests
// exercise pure logic, so an in-memory stand-in is all that is needed.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
      setItem: (k: string, v: string) => { store.set(k, v); return Promise.resolve(); },
      removeItem: (k: string) => { store.delete(k); return Promise.resolve(); },
    },
  };
});

import { classifyApiError, isRetriable, extractServerMessage, messageForKind } from '../src/services/apiError';
import { backoffMs, isDueForRetry, makeLeadCode } from '../src/services/leadDraftStorage';

const axiosErr = (over: any) => ({ isAxiosError: true, config: {}, ...over });

describe('classifyApiError', () => {
  it('reads a client timeout, not "offline"', () => {
    expect(classifyApiError(axiosErr({ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }))).toBe('timeout');
  });
  it('reads no-route-to-host as offline', () => {
    expect(classifyApiError(axiosErr({ code: 'ERR_NETWORK', message: 'Network Error' }))).toBe('offline');
  });
  it('maps status codes', () => {
    expect(classifyApiError(axiosErr({ response: { status: 400 } }))).toBe('validation');
    expect(classifyApiError(axiosErr({ response: { status: 401 } }))).toBe('auth');
    expect(classifyApiError(axiosErr({ response: { status: 500 } }))).toBe('server');
  });
});

describe('isRetriable', () => {
  it('queues transport failures but never a rejected payload', () => {
    expect(isRetriable('offline')).toBe(true);
    expect(isRetriable('timeout')).toBe(true);
    expect(isRetriable('server')).toBe(true);
    expect(isRetriable('validation')).toBe(false);
    expect(isRetriable('auth')).toBe(false);
  });
});

describe('extractServerMessage', () => {
  it('reads the `error` key the ERP API actually sends', () => {
    expect(extractServerMessage(axiosErr({ response: { data: { error: 'city: Required' } } }))).toBe('city: Required');
  });
  it('still accepts `message` for any endpoint that uses it', () => {
    expect(extractServerMessage(axiosErr({ response: { data: { message: 'Insufficient stock' } } }))).toBe('Insufficient stock');
  });
  it('ignores an HTML error page', () => {
    expect(extractServerMessage(axiosErr({ response: { data: '<!doctype html><h1>502</h1>' } }))).toBeUndefined();
  });
});

describe('messageForKind', () => {
  it('never promises background submission', () => {
    const msg = messageForKind('offline', { queued: true, noun: 'lead' });
    expect(msg).toMatch(/next time you open the app/i);
    expect(msg).not.toMatch(/automatically/i);
  });
  it('never emits the old generic string', () => {
    for (const k of ['offline', 'timeout', 'server', 'auth', 'validation'] as const) {
      expect(messageForKind(k, { queued: true })).not.toBe('Something went wrong. Please try again.');
    }
  });
});

describe('backoff', () => {
  it('grows then caps at 15 minutes', () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(20)).toBe(15 * 60_000);
  });
});

const draft = (over: any = {}) => ({
  schemaVersion: 1, draftId: 'd1', mrId: 1, leadType: 'doctor' as const,
  code: 'LEDX', payload: {}, displayName: 'x', createdAt: 0, updatedAt: 0,
  attemptCount: 0, lastAttemptAt: null, lastErrorKind: null, lastErrorMessage: null,
  status: 'pending' as const, ...over,
});

describe('isDueForRetry', () => {
  it('runs a never-attempted draft immediately', () => {
    expect(isDueForRetry(draft(), 1_000_000)).toBe(true);
  });
  it('honours the backoff window', () => {
    const d = draft({ attemptCount: 1, lastAttemptAt: 1_000_000 });
    expect(isDueForRetry(d, 1_000_000 + 29_000)).toBe(false);
    expect(isDueForRetry(d, 1_000_000 + 31_000)).toBe(true);
  });
  it('never retries a failed draft unattended', () => {
    expect(isDueForRetry(draft({ status: 'failed' }), 9_999_999)).toBe(false);
  });
});

describe('makeLeadCode', () => {
  it('fits varchar(20) and does not repeat', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const c = makeLeadCode();
      expect(c.length).toBeLessThanOrEqual(20);
      expect(c.startsWith('LED')).toBe(true);
      codes.add(c);
    }
    // The old generator wrapped every ~16m40s; this must not collide in a burst.
    expect(codes.size).toBeGreaterThan(4990);
  });
});
