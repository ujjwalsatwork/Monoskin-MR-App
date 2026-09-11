import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiFailureKind } from './apiError';

// ─────────────────────────────────────────────────────────────────────────────
// Unsent lead submissions — crash-survivable local queue.
//
// An MR fills a lead in a village with no signal, taps Save, and the request
// times out. Before this, everything they typed lived only in React state and
// died with the screen. Now the built payload is written here first, so the work
// is safe the moment the submit fails, and is re-sent on a later app open.
//
// Purely local. The server never learns a draft exists until it submits, so an
// unsent lead is invisible to the ERP web app and to the MR's manager.
//
// Mirrors the conventions in `visitSessionStorage.ts`: version in the key, an
// explicit `schemaVersion`, an owner guard for shared handsets, and every call
// swallowed on failure — a storage error must never block the MR.
// ─────────────────────────────────────────────────────────────────────────────

// Versioned in the key itself: a shape change bumps to `_v2` and orphans `_v1`
// rather than needing migration code.
export const LEAD_DRAFTS_KEY = '@monoskin/lead_drafts_v1';

const SCHEMA_VERSION = 1;

/** Stop retrying unattended after this many failed attempts. */
export const MAX_SYNC_ATTEMPTS = 8;

/** Hard ceiling so a runaway queue can never fill the device. */
const MAX_DRAFTS = 50;

export type LeadDraftStatus =
    /** Queued, waiting for a flush. */
    | 'pending'
    /** A request is in flight right now. */
    | 'syncing'
    /** Terminal: needs the MR to look at it (rejected, or attempts exhausted). */
    | 'failed';

export type LeadDraftType = 'doctor' | 'pharmacy';

export interface LeadDraft {
    schemaVersion: number;
    draftId: string;
    /** Ownership guard — a draft must never surface under a different MR's login. */
    mrId: number;
    leadType: LeadDraftType;
    /**
     * THE idempotency key. Minted once when the form opens and never regenerated,
     * so every retry of this draft carries the same value and the server resolves
     * a replay to the lead it already created instead of making a second one.
     */
    code: string;
    /** The exact body to POST. Stored built, so there is one serialisation format. */
    payload: Record<string, unknown>;
    /** What to show on the draft row. */
    displayName: string;
    createdAt: number;
    updatedAt: number;
    attemptCount: number;
    lastAttemptAt: number | null;
    lastErrorKind: ApiFailureKind | null;
    /** The server's own words, when it gave any. Shown on a failed row. */
    lastErrorMessage: string | null;
    status: LeadDraftStatus;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const createDraftId = (): string =>
    `ld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Lead code generator — the client half of the idempotency contract.
 *
 * Matches `makeEntityCode` on the server. The old form took the last six digits
 * of a millisecond epoch, which wrapped every ~16m 40s against a UNIQUE column;
 * base36 of the full epoch plus a random suffix never wraps and stays inside
 * varchar(20).
 */
export const makeLeadCode = (): string => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
    return `LED${ts}${rand}`;
};

/**
 * How long to wait before attempt N may run again. Exponential from 30s, capped
 * at 15 minutes so a long-dead link doesn't hammer the radio.
 */
export const backoffMs = (attemptCount: number): number =>
    Math.min(30_000 * Math.pow(2, Math.max(0, attemptCount - 1)), 15 * 60_000);

/** True when this draft is due for another attempt. */
export const isDueForRetry = (draft: LeadDraft, now = Date.now()): boolean => {
    if (draft.status !== 'pending') { return false; }
    if (draft.attemptCount === 0 || draft.lastAttemptAt == null) { return true; }
    return now - draft.lastAttemptAt >= backoffMs(draft.attemptCount);
};

const isValidDraft = (raw: unknown): raw is LeadDraft => {
    if (!raw || typeof raw !== 'object') { return false; }
    const d = raw as Partial<LeadDraft>;
    if (d.schemaVersion !== SCHEMA_VERSION) { return false; }
    if (typeof d.draftId !== 'string' || !d.draftId) { return false; }
    if (typeof d.mrId !== 'number' || !Number.isFinite(d.mrId)) { return false; }
    if (d.leadType !== 'doctor' && d.leadType !== 'pharmacy') { return false; }
    if (typeof d.code !== 'string' || !d.code) { return false; }
    if (!d.payload || typeof d.payload !== 'object') { return false; }
    if (d.status !== 'pending' && d.status !== 'syncing' && d.status !== 'failed') { return false; }
    return true;
};

export const buildLeadDraft = (input: {
    mrId: number;
    leadType: LeadDraftType;
    code: string;
    payload: Record<string, unknown>;
    displayName: string;
}): LeadDraft => {
    const now = Date.now();
    return {
        schemaVersion: SCHEMA_VERSION,
        draftId: createDraftId(),
        mrId: input.mrId,
        leadType: input.leadType,
        code: input.code,
        payload: input.payload,
        displayName: input.displayName || 'Untitled lead',
        createdAt: now,
        updatedAt: now,
        attemptCount: 0,
        lastAttemptAt: null,
        lastErrorKind: null,
        lastErrorMessage: null,
        status: 'pending',
    };
};

// ─── Storage API ─────────────────────────────────────────────────────────────
// Every call is swallowed on failure. Losing crash-recovery is bad; blocking the
// MR mid-form is worse.
//
// All writes go through one promise chain. Two screens can save a draft in the
// same tick, and a naive read-modify-write would silently drop one of them.

let writeChain: Promise<unknown> = Promise.resolve();

const serialize = <T>(task: () => Promise<T>): Promise<T> => {
    const run = writeChain.then(task, task);
    // Keep the chain alive even when a task rejects.
    writeChain = run.catch(() => undefined);
    return run;
};

const readRaw = async (): Promise<LeadDraft[]> => {
    try {
        const raw = await AsyncStorage.getItem(LEAD_DRAFTS_KEY);
        if (!raw) { return []; }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) { return []; }
        // Drop anything unreadable rather than throwing the whole queue away.
        return parsed.filter(isValidDraft);
    } catch (err) {
        console.log('🚀 ~ readLeadDrafts ~ error:', err);
        return [];
    }
};

/**
 * Cap the queue PER MR, not globally.
 *
 * A single flat `.slice(0, MAX_DRAFTS)` would let one busy MR on a shared handset
 * evict another MR's unsent leads — silent data loss for someone who is not even
 * signed in to see it happen. Newest are kept, since `upsert` unshifts.
 */
const capPerOwner = (drafts: LeadDraft[]): LeadDraft[] => {
    const seen = new Map<number, number>();
    return drafts.filter(d => {
        const count = (seen.get(d.mrId) ?? 0) + 1;
        seen.set(d.mrId, count);
        return count <= MAX_DRAFTS;
    });
};

const writeRaw = async (drafts: LeadDraft[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(LEAD_DRAFTS_KEY, JSON.stringify(capPerOwner(drafts)));
    } catch (err) {
        console.log('🚀 ~ writeLeadDrafts ~ error:', err);
    }
};

/**
 * Read this MR's drafts.
 *
 * `ownerId === null` means identity has not resolved yet — return nothing, and
 * critically do NOT delete anything: another MR's drafts are simply not ours to
 * show, and our own may still be on disk waiting for auth to finish.
 *
 * Any draft left at `syncing` was interrupted by the app being killed mid-request.
 * It is reset to `pending` here, otherwise every future flush would skip it as
 * already in flight and it would never be sent again. Safe to do unconditionally:
 * the stable `code` makes a re-send idempotent server-side.
 */
export const readLeadDrafts = async (ownerId: number | null): Promise<LeadDraft[]> => {
    if (ownerId == null) { return []; }
    const all = await readRaw();
    return all
        .filter(d => d.mrId === ownerId)
        .map(d => (d.status === 'syncing' ? { ...d, status: 'pending' as const } : d));
};

/** Insert or replace one draft, keyed on `draftId`. */
export const upsertLeadDraft = async (draft: LeadDraft): Promise<LeadDraft[]> =>
    serialize(async () => {
        const all = await readRaw();
        const next = all.filter(d => d.draftId !== draft.draftId);
        next.unshift({ ...draft, updatedAt: Date.now() });
        await writeRaw(next);
        return next.filter(d => d.mrId === draft.mrId);
    });

/** Merge a partial change into one draft. No-op if it is already gone. */
export const patchLeadDraft = async (
    draftId: string,
    patch: Partial<Omit<LeadDraft, 'draftId' | 'schemaVersion' | 'mrId'>>,
): Promise<LeadDraft | null> =>
    serialize(async () => {
        const all = await readRaw();
        const index = all.findIndex(d => d.draftId === draftId);
        if (index === -1) { return null; }
        const updated: LeadDraft = { ...all[index], ...patch, updatedAt: Date.now() };
        all[index] = updated;
        await writeRaw(all);
        return updated;
    });

export const removeLeadDraft = async (draftId: string): Promise<void> =>
    serialize(async () => {
        const all = await readRaw();
        await writeRaw(all.filter(d => d.draftId !== draftId));
    });

/**
 * Wipe every draft belonging to one MR.
 *
 * NOT called on logout. An expired session is exactly when an MR has unsent work,
 * and clearing it there would destroy the data this queue exists to protect —
 * drafts stay on disk and come back when that MR signs in again. This exists for
 * an explicit "discard all" action only.
 */
export const clearLeadDraftsForOwner = async (ownerId: number): Promise<void> =>
    serialize(async () => {
        const all = await readRaw();
        await writeRaw(all.filter(d => d.mrId !== ownerId));
    });
